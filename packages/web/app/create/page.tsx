'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useChainId, usePublicClient } from 'wagmi'
import { parseUnits, keccak256, toBytes } from 'viem'
import { 
  REALITIO_ERC20_ABI, 
  ERC20_ABI,
  getDeployedAddresses, 
  getDeployments,
  resolveBondTokens,
  type BondToken
} from '@/lib/contracts'
import { USDT_MAINNET, type Addr } from '@/lib/viem'
import { useRouter } from 'next/navigation'

const TIMEOUT_PRESETS = [
  { label: '24H', seconds: 24 * 60 * 60 },
  { label: '3D', seconds: 3 * 24 * 60 * 60 },
  { label: '7D', seconds: 7 * 24 * 60 * 60 },
  { label: '1M', seconds: 30 * 24 * 60 * 60 },
  { label: '3M', seconds: 90 * 24 * 60 * 60 },
]

export default function CreateQuestion() {
  const router = useRouter()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  
  const [formData, setFormData] = useState({
    templateId: '0',
    question: '',
    arbitrator: '',
    openingTs: '0',
  })
  const [bondToken, setBondToken] = useState<Addr | null>(null)
  const [availableTokens, setAvailableTokens] = useState<BondToken[]>([])
  const [timeout, setTimeout] = useState<number>(24 * 60 * 60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [allowance, setAllowance] = useState<bigint>(0n)
  const [checkingAllowance, setCheckingAllowance] = useState(false)

  useEffect(() => {
    async function loadTokens() {
      const deployments = await getDeployments(chainId)
      const tokens = resolveBondTokens(chainId, deployments)
      setAvailableTokens(tokens)
      
      if (tokens.length > 0) {
        const usdtToken = tokens.find(t => t.label === 'USDT')
        setBondToken(usdtToken?.address || tokens[0].address)
      }
    }
    loadTokens()
  }, [chainId])

  useEffect(() => {
    async function checkAllowance() {
      if (!bondToken || !address || !publicClient) return
      
      setCheckingAllowance(true)
      try {
        const addresses = await getDeployedAddresses(chainId)
        if (!addresses) return
        
        const allowanceValue = await publicClient.readContract({
          address: bondToken,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, addresses.realitioERC20 as Addr],
        }) as bigint
        
        setAllowance(allowanceValue)
      } catch (err) {
        console.error('Error checking allowance:', err)
      } finally {
        setCheckingAllowance(false)
      }
    }
    
    checkAllowance()
  }, [bondToken, address, publicClient, chainId])

  const handleApprove = async () => {
    if (!walletClient || !bondToken || !address) return
    
    setLoading(true)
    setError('')
    
    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) throw new Error('Contract addresses not found')
      
      const selectedToken = availableTokens.find(t => t.address === bondToken)
      if (!selectedToken) throw new Error('Token not found')
      
      const amount = parseUnits('1000000', selectedToken.decimals)
      
      await walletClient.writeContract({
        address: bondToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.realitioERC20 as Addr, amount],
      })
      
      setAllowance(amount)
    } catch (err: any) {
      console.error('Error approving:', err)
      setError(err.message || 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletClient || !address || !bondToken) {
      setError('Please connect your wallet and select a bond token')
      return
    }

    setLoading(true)
    setError('')

    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) {
        throw new Error('Contract addresses not found')
      }

      const nonce = keccak256(toBytes(Date.now().toString() + Math.random().toString()))
      
      const arbitratorAddress = formData.arbitrator || addresses.arbitratorSimple
      const openingTs = formData.openingTs === '0' ? Math.floor(Date.now() / 1000) : parseInt(formData.openingTs)

      const hash = await walletClient.writeContract({
        address: addresses.realitioERC20 as Addr,
        abi: REALITIO_ERC20_ABI,
        functionName: 'askQuestionERC20',
        args: [
          bondToken,
          parseInt(formData.templateId),
          formData.question,
          arbitratorAddress as Addr,
          timeout,
          openingTs,
          nonce,
        ],
      })

      router.push('/')
    } catch (err: any) {
      console.error('Error creating question:', err)
      setError(err.message || 'Failed to create question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold mb-6">Create New Question</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="bondToken" className="block text-sm font-medium text-gray-700">
                  Bond Token
                </label>
                <select
                  id="bondToken"
                  value={bondToken || ''}
                  onChange={(e) => setBondToken(e.target.value as Addr)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  <option value="" disabled>Select a bond token</option>
                  {availableTokens.map(token => (
                    <option key={token.address} value={token.address}>
                      {token.label} ({token.symbol})
                    </option>
                  ))}
                </select>
                {bondToken && allowance === 0n && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={loading || checkingAllowance}
                    className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {checkingAllowance ? 'Checking...' : 'Approve Token'}
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="templateId" className="block text-sm font-medium text-gray-700">
                  Template ID
                </label>
                <input
                  type="number"
                  id="templateId"
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                  Question
                </label>
                <textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Will ETH price be above $3000 on 2025-01-01?"
                  required
                />
              </div>

              <div>
                <label htmlFor="arbitrator" className="block text-sm font-medium text-gray-700">
                  Arbitrator Address (optional)
                </label>
                <input
                  type="text"
                  id="arbitrator"
                  value={formData.arbitrator}
                  onChange={(e) => setFormData({ ...formData, arbitrator: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Leave empty to use default arbitrator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout
                </label>
                <div className="flex gap-2">
                  {TIMEOUT_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setTimeout(preset.seconds)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                        timeout === preset.seconds
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Selected: {timeout} seconds ({Math.floor(timeout / 86400)} days, {Math.floor((timeout % 86400) / 3600)} hours)
                </p>
              </div>

              <div>
                <label htmlFor="openingTs" className="block text-sm font-medium text-gray-700">
                  Opening Timestamp
                </label>
                <input
                  type="number"
                  id="openingTs"
                  value={formData.openingTs}
                  onChange={(e) => setFormData({ ...formData, openingTs: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">0 for immediate opening, or Unix timestamp for future opening</p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !address || !bondToken || allowance === 0n}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}