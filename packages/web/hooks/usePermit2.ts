'use client'

import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { SignatureTransfer } from '@uniswap/permit2-sdk'
import { useState } from 'react'
import { parseUnits, type Address } from 'viem'

interface UsePermit2Props {
  bondToken: Address
  realitioAddress: Address
  permit2Address: Address
  chainId: number
}

export function usePermit2({ 
  bondToken, 
  realitioAddress, 
  permit2Address,
  chainId
}: UsePermit2Props) {
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isSigningPermit, setIsSigningPermit] = useState(false)
  
  const signPermit2 = async (totalAmount: bigint) => {
    if (!account || !walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }
    
    setIsSigningPermit(true)
    
    try {
      // Get current nonce from Permit2 contract
      const nonceData = await publicClient.readContract({
        address: permit2Address,
        abi: [{
          name: 'nonceBitmap',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'wordPos', type: 'uint256' }
          ],
          outputs: [{ type: 'uint256' }]
        }],
        functionName: 'nonceBitmap',
        args: [account, 0n]
      }) as bigint
      
      // Find first unused nonce
      let nonce = 0n
      for (let i = 0n; i < 256n; i++) {
        if ((nonceData & (1n << i)) === 0n) {
          nonce = i
          break
        }
      }
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      
      const permit = {
        permitted: {
          token: bondToken,
          amount: totalAmount
        },
        spender: realitioAddress,
        nonce: nonce,
        deadline: deadline
      }
      
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Address,
        chainId
      )
      
      // Sign the permit
      const signature = await walletClient.signTypedData({
        account,
        domain: domain as any,
        types: types as any,
        primaryType: 'PermitTransferFrom',
        message: values as any
      })
      
      setIsSigningPermit(false)
      
      return {
        permit: {
          permitted: {
            token: bondToken,
            amount: totalAmount
          },
          nonce,
          deadline
        },
        signature
      }
    } catch (error) {
      setIsSigningPermit(false)
      throw error
    }
  }
  
  return {
    signPermit2,
    isSigningPermit
  }
}

export function usePermit2612({
  bondToken,
  realitioAddress,
  chainId
}: {
  bondToken: Address
  realitioAddress: Address
  chainId: number
}) {
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isSigningPermit, setIsSigningPermit] = useState(false)
  
  const signPermit2612 = async (totalAmount: bigint) => {
    if (!account || !walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }
    
    setIsSigningPermit(true)
    
    try {
      // Get token name and current nonce
      const [name, nonce, version] = await Promise.all([
        publicClient.readContract({
          address: bondToken,
          abi: [{
            name: 'name',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'string' }]
          }],
          functionName: 'name'
        }),
        publicClient.readContract({
          address: bondToken,
          abi: [{
            name: 'nonces',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ type: 'uint256' }]
          }],
          functionName: 'nonces',
          args: [account]
        }),
        // Try to get version, default to "1" if not available
        publicClient.readContract({
          address: bondToken,
          abi: [{
            name: 'version',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'string' }]
          }],
          functionName: 'version'
        }).catch(() => '1')
      ])
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      
      const domain = {
        name,
        version,
        chainId,
        verifyingContract: bondToken
      }
      
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      }
      
      const message = {
        owner: account,
        spender: realitioAddress,
        value: totalAmount,
        nonce: nonce as bigint,
        deadline
      }
      
      const signature = await walletClient.signTypedData({
        account,
        domain: domain as any,
        types,
        primaryType: 'Permit',
        message: message as any
      })
      
      // Split signature
      const sig = signature.slice(2)
      const r = `0x${sig.substring(0, 64)}`
      const s = `0x${sig.substring(64, 128)}`
      const v = parseInt(sig.substring(128, 130), 16)
      
      setIsSigningPermit(false)
      
      return {
        deadline,
        v,
        r,
        s
      }
    } catch (error) {
      setIsSigningPermit(false)
      throw error
    }
  }
  
  return {
    signPermit2612,
    isSigningPermit
  }
}