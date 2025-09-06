'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi'
import { formatEther, parseEther, parseUnits, formatUnits, keccak256, toHex, pad, encodeAbiParameters, parseAbiParameters } from 'viem'
import { REALITIO_ABI, ERC20_ABI, resolveBondTokens, type BondToken } from '@/lib/contracts'
import { useAddresses } from '@/lib/contracts.client'
import { CHAIN_LABEL } from '@/lib/viem'
import { networkStatus, KAIA_MAINNET_ID, KAIA_TESTNET_ID } from '@/lib/chain'
import { PaymentModeSelector, type PaymentMode } from '@/components/PaymentModeSelector'
import { usePermit2, usePermit2612 } from '@/hooks/usePermit2'
import { quoteFee } from '@/lib/fees'
import { SignatureTransfer } from '@uniswap/permit2-sdk'
import { createPermitTransferFrom } from '@/lib/permit'
import FeeNotice from '@/components/FeeNotice'
import DisclaimerBadge from '@/components/DisclaimerBadge'
import DisclaimerGate from '@/components/DisclaimerGate'
import { TEMPLATES } from '@/lib/templates'

export default function QuestionDetail({ params }: { params: { id: string } }) {
  const questionId = params.id as `0x${string}`
  
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { addr, deployments, ready: addrReady, loading: addrLoading, error: addrError, feeBps } = useAddresses()
  
  const status = networkStatus(isConnected, chainId)
  const gated = (status === "NOT_CONNECTED" || status === "WRONG_NETWORK")
  
  const [question, setQuestion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [answerForm, setAnswerForm] = useState({
    answer: '',
    bond: '',
    isCommit: false,
    nonce: '',
  })
  
  const [revealForm, setRevealForm] = useState({
    answer: '',
    nonce: '',
  })
  
  const [bondTokenInfo, setBondTokenInfo] = useState<BondToken | null>(null)
  const [feeInfo, setFeeInfo] = useState<{ feeBps: number; feeRecipient: string } | null>(null)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('permit2')
  const [deploymentsState, setDeploymentsState] = useState<any>(null)
  const [feeQuote, setFeeQuote] = useState<{ feeFormatted: string; totalFormatted: string } | null>(null)
  const [wkaiaAmount, setWkaiaAmount] = useState<bigint>(0n)

  const loadQuestion = useCallback(async () => {
    if (!publicClient || !questionId) return
    
    try {
      if (!addr.reality) { setLoading(false); return }

      const questionData = await publicClient.readContract({
        address: addr.reality as `0x${string}`,
        abi: REALITIO_ABI,
        functionName: 'getQuestion',
        args: [questionId],
      })

      const questionInfo = {
        id: questionId,
        arbitrator: questionData[0],
        bondToken: questionData[1],
        timeout: questionData[2],
        openingTs: questionData[3],
        contentHash: questionData[4],
        bestAnswer: questionData[5],
        bestBond: questionData[6],
        bestAnswerer: questionData[7],
        lastAnswerTs: questionData[8],
        finalized: questionData[9],
      }
      
      setQuestion(questionInfo)
      
      // Get bond token info and fee info
      setDeploymentsState(deployments)
      const tokens = resolveBondTokens(chainId, deployments)
      const token = tokens.find(t => t.address.toLowerCase() === questionInfo.bondToken?.toLowerCase())
      setBondTokenInfo(token || null)
      
      // Load fee info
      if (deployments?.feeBps && deployments?.feeRecipient) {
        setFeeInfo({
          feeBps: deployments.feeBps,
          feeRecipient: deployments.feeRecipient
        })
      }
    } catch (err) {
      console.error('Error loading question:', err)
    } finally {
      setLoading(false)
    }
  }, [publicClient, questionId, addr.reality, deployments, chainId])

  useEffect(() => {
    if (!questionId) return
    if (!addr.reality) return
    loadQuestion()
    const interval = setInterval(loadQuestion, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [questionId, addr.reality, loadQuestion])

  // Initialize Permit2 hooks
  const { signPermit2 } = usePermit2({
    bondToken: question?.bondToken as `0x${string}`,
    realitioAddress: deploymentsState?.realitioERC20 as `0x${string}`,
    permit2Address: deploymentsState?.PERMIT2 as `0x${string}`,
    chainId
  })
  
  const { signPermit2612 } = usePermit2612({
    bondToken: question?.bondToken as `0x${string}`,
    realitioAddress: deploymentsState?.realitioERC20 as `0x${string}`,
    chainId
  })
  
  // Calculate fee when bond amount changes
  useEffect(() => {
    async function calculateFeeQuote() {
      if (!bondTokenInfo || !publicClient || !answerForm.bond || !deploymentsState?.realitioERC20) return
      
      try {
        const bondRaw = bondTokenInfo?.decimals
          ? parseUnits(answerForm.bond || '0', bondTokenInfo.decimals)
          : parseEther(answerForm.bond || '0')
        
        const quote = await quoteFee({
          client: publicClient,
          reality: deploymentsState.realitioERC20 as `0x${string}`,
          bondTokenDecimals: bondTokenInfo?.decimals || 18,
          bondRaw,
          feeBpsFallback: feeInfo?.feeBps || 25
        })
        
        setFeeQuote({ feeFormatted: quote.feeFormatted, totalFormatted: quote.totalFormatted })
      } catch (err) {
        console.error('Error calculating fee:', err)
      }
    }
    
    calculateFeeQuote()
  }, [answerForm.bond, bondTokenInfo, publicClient, deploymentsState, feeInfo])

  const handleSubmitAnswer = async () => {
    if (!walletClient || !address || !publicClient || !questionId) return
    
    setActionLoading(true)
    setError('')
    
    try {
      if (!addr.reality) throw new Error('Contract addresses not found')
      
      const bondAmount = bondTokenInfo?.decimals 
        ? parseUnits(answerForm.bond, bondTokenInfo.decimals)
        : parseEther(answerForm.bond)
      
      // Calculate fee
      const feeAmount = feeInfo ? (bondAmount * BigInt(feeInfo.feeBps)) / 10000n : 0n
      const totalAmount = bondAmount + feeAmount
      
      const answerBytes = pad(toHex(BigInt(answerForm.answer)), { size: 32 })
      
      if (answerForm.isCommit) {
        // Submit commitment
        const nonceBytes = keccak256(toHex(answerForm.nonce))
        const answerHash = keccak256(
          encodeAbiParameters(
            parseAbiParameters('bytes32, bytes32'),
            [answerBytes, nonceBytes]
          )
        )
        
        if (paymentMode === 'permit2' && deploymentsState?.PERMIT2) {
          // Use Permit2
          const { permit, signature } = await signPermit2(totalAmount)
          await walletClient.writeContract({
            address: addr.reality as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'submitAnswerCommitmentWithPermit2',
            args: [questionId, answerHash, bondAmount, permit, signature, address],
          })
        } else if (paymentMode === 'permit2612') {
          // Use EIP-2612 Permit
          const { deadline, v, r, s } = await signPermit2612(totalAmount)
          const bondToken = question.bondToken || deploymentsState?.USDT || '0x0000000000000000000000000000000000000000'
          await walletClient.writeContract({
            address: addr.reality as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'submitAnswerCommitmentWithPermit2612',
            args: [questionId, answerHash, bondAmount, bondToken as `0x${string}`, deadline as bigint, v, r as `0x${string}`, s as `0x${string}`],
          })
        } else if (paymentMode === 'mixed' && addr.zapper) {
          // Use Mixed (WKAIA + KAIA) payment via Zapper
          const desiredWkaia = wkaiaAmount > totalAmount ? totalAmount : wkaiaAmount
          const remainderKaia = totalAmount > desiredWkaia ? totalAmount - desiredWkaia : 0n
          
          let permit = null
          let signature: `0x${string}` = '0x'
          
          if (desiredWkaia > 0n) {
            // Create Permit2 signature for WKAIA portion
            const nonce = BigInt(Math.floor(Math.random() * 2**48))
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
            permit = {
              permitted: {
                token: addr.wkaia!,
                amount: desiredWkaia
              },
              spender: addr.zapper!,
              nonce,
              deadline
            }
            const permitData = SignatureTransfer.getPermitData(permit, addr.permit2!, chainId)
            signature = await walletClient.signTypedData({
              domain: {
                name: permitData.domain.name,
                version: permitData.domain.version,
                chainId: Number(permitData.domain.chainId),
                verifyingContract: permitData.domain.verifyingContract as `0x${string}`,
                ...(permitData.domain.salt && { salt: permitData.domain.salt as `0x${string}` })
              },
              types: permitData.types,
              primaryType: 'PermitTransferFrom',
              message: permitData.values as any,
              account: address
            })
          } else {
            // No WKAIA, create dummy permit
            permit = {
              permitted: {
                token: addr.wkaia || '0x0000000000000000000000000000000000000000',
                amount: 0n
              },
              spender: addr.zapper!,
              nonce: 0n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600)
            }
          }
          
          // Import ZAPPER_WKAIA_ABI if not imported yet
          const ZAPPER_WKAIA_ABI = [
            {
              "type": "function",
              "name": "commitMixedWithPermit2",
              "inputs": [
                {"name": "qid", "type": "bytes32"},
                {"name": "commitment", "type": "bytes32"},
                {"name": "bond", "type": "uint256"},
                {
                  "name": "permit",
                  "type": "tuple",
                  "components": [
                    {
                      "name": "permitted",
                      "type": "tuple",
                      "components": [
                        {"name": "token", "type": "address"},
                        {"name": "amount", "type": "uint256"}
                      ]
                    },
                    {"name": "nonce", "type": "uint256"},
                    {"name": "deadline", "type": "uint256"}
                  ]
                },
                {"name": "signature", "type": "bytes"},
                {"name": "owner", "type": "address"},
                {"name": "wkaiaMaxFromPermit", "type": "uint256"}
              ],
              "outputs": [],
              "stateMutability": "payable"
            }
          ] as const
          
          await walletClient.writeContract({
            address: addr.zapper as `0x${string}`,
            abi: ZAPPER_WKAIA_ABI,
            functionName: 'commitMixedWithPermit2',
            args: [questionId, answerHash, bondAmount, permit, signature, address, desiredWkaia],
            value: remainderKaia
          })
        } else {
          // Traditional approve flow
          if (question.bondToken && question.bondToken !== '0x0000000000000000000000000000000000000000') {
            await walletClient.writeContract({
              address: question.bondToken as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [addr.reality as `0x${string}`, totalAmount],
            })
          }
          await walletClient.writeContract({
            address: addr.reality as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'submitAnswerCommitment',
            args: [questionId, answerHash, bondAmount],
          })
        }
      } else {
        // Submit answer directly
        if (paymentMode === 'permit2' && deploymentsState?.PERMIT2) {
          // Use Permit2
          const { permit, signature } = await signPermit2(totalAmount)
          await walletClient.writeContract({
            address: addr.reality as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'submitAnswerWithPermit2',
            args: [questionId, answerBytes, bondAmount, permit, signature, address],
          })
        } else if (paymentMode === 'permit2612') {
          // Use EIP-2612 Permit
          const { deadline, v, r, s } = await signPermit2612(totalAmount)
          const bondToken = question.bondToken || deploymentsState?.USDT || '0x0000000000000000000000000000000000000000'
          await walletClient.writeContract({
            address: addr.reality as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'submitAnswerWithPermit2612',
            args: [questionId, answerBytes, bondAmount, bondToken as `0x${string}`, deadline as bigint, v, r as `0x${string}`, s as `0x${string}`],
          })
        } else if (paymentMode === 'mixed' && addr.zapper) {
          // Use Mixed (WKAIA + KAIA) payment via Zapper
          const desiredWkaia = wkaiaAmount > totalAmount ? totalAmount : wkaiaAmount
          const remainderKaia = totalAmount > desiredWkaia ? totalAmount - desiredWkaia : 0n
          
          let permit = null
          let signature: `0x${string}` = '0x'
          
          if (desiredWkaia > 0n) {
            // Create Permit2 signature for WKAIA portion
            const nonce = BigInt(Math.floor(Math.random() * 2**48))
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
            permit = {
              permitted: {
                token: addr.wkaia!,
                amount: desiredWkaia
              },
              spender: addr.zapper!,
              nonce,
              deadline
            }
            const permitData = SignatureTransfer.getPermitData(permit, addr.permit2!, chainId)
            signature = await walletClient.signTypedData({
              domain: {
                name: permitData.domain.name,
                version: permitData.domain.version,
                chainId: Number(permitData.domain.chainId),
                verifyingContract: permitData.domain.verifyingContract as `0x${string}`,
                ...(permitData.domain.salt && { salt: permitData.domain.salt as `0x${string}` })
              },
              types: permitData.types,
              primaryType: 'PermitTransferFrom',
              message: permitData.values as any,
              account: address
            })
          } else {
            // No WKAIA, create dummy permit
            permit = {
              permitted: {
                token: addr.wkaia || '0x0000000000000000000000000000000000000000',
                amount: 0n
              },
              spender: addr.zapper!,
              nonce: 0n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600)
            }
          }
          
          // Import ZAPPER_WKAIA_ABI if not imported yet
          const ZAPPER_WKAIA_ABI = [
            {
              "type": "function",
              "name": "answerMixedWithPermit2",
              "inputs": [
                {"name": "qid", "type": "bytes32"},
                {"name": "answer", "type": "bytes32"},
                {"name": "bond", "type": "uint256"},
                {
                  "name": "permit",
                  "type": "tuple",
                  "components": [
                    {
                      "name": "permitted",
                      "type": "tuple",
                      "components": [
                        {"name": "token", "type": "address"},
                        {"name": "amount", "type": "uint256"}
                      ]
                    },
                    {"name": "nonce", "type": "uint256"},
                    {"name": "deadline", "type": "uint256"}
                  ]
                },
                {"name": "signature", "type": "bytes"},
                {"name": "owner", "type": "address"},
                {"name": "wkaiaMaxFromPermit", "type": "uint256"}
              ],
              "outputs": [],
              "stateMutability": "payable"
            }
          ] as const
          
          await walletClient.writeContract({
            address: addr.zapper as `0x${string}`,
            abi: ZAPPER_WKAIA_ABI,
            functionName: 'answerMixedWithPermit2',
            args: [questionId, answerBytes, bondAmount, permit, signature, address, desiredWkaia],
            value: remainderKaia
          })
        } else {
          // Traditional approve flow
          if (question.bondToken && question.bondToken !== '0x0000000000000000000000000000000000000000') {
            await walletClient.writeContract({
              address: question.bondToken as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [addr.reality as `0x${string}`, totalAmount],
            })
            await walletClient.writeContract({
              address: addr.reality as `0x${string}`,
              abi: REALITIO_ABI,
              functionName: 'submitAnswerWithToken',
              args: [questionId, answerBytes, bondAmount, question.bondToken as `0x${string}`],
            })
          } else {
            await walletClient.writeContract({
              address: addr.reality as `0x${string}`,
              abi: REALITIO_ABI,
              functionName: 'submitAnswer',
              args: [questionId, answerBytes, bondAmount],
            })
          }
        }
      }
      
      await loadQuestion()
      setAnswerForm({ answer: '', bond: '', isCommit: false, nonce: '' })
    } catch (err: any) {
      console.error('Error submitting answer:', err)
      setError(err.message || 'Failed to submit answer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReveal = async () => {
    if (!walletClient || !address || !questionId) return
    
    setActionLoading(true)
    setError('')
    
    try {
      if (!addr.reality) throw new Error('Contract addresses not found')
      
      const answerBytes = pad(toHex(BigInt(revealForm.answer)), { size: 32 })
      const nonceBytes = keccak256(toHex(revealForm.nonce))
      
      await walletClient.writeContract({
        address: addr.reality as `0x${string}`,
        abi: REALITIO_ABI,
        functionName: 'revealAnswer',
        args: [questionId, answerBytes, nonceBytes],
      })
      
      await loadQuestion()
      setRevealForm({ answer: '', nonce: '' })
    } catch (err: any) {
      console.error('Error revealing answer:', err)
      setError(err.message || 'Failed to reveal answer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinalize = async () => {
    if (!walletClient || !address || !questionId) return
    
    setActionLoading(true)
    setError('')
    
    try {
      if (!addr.reality) throw new Error('Contract addresses not found')
      
      await walletClient.writeContract({
        address: addr.reality as `0x${string}`,
        abi: REALITIO_ABI,
        functionName: 'finalize',
        args: [questionId],
      })
      
      await loadQuestion()
    } catch (err: any) {
      console.error('Error finalizing:', err)
      setError(err.message || 'Failed to finalize')
    } finally {
      setActionLoading(false)
    }
  }

  // Loading guards
  if (addrLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center opacity-70">Loading network deployments…</div>
      </div>
    )
  }
  
  if (addrError || !addrReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-300">
          Missing deployment info for chain {chainId}. Ensure 
          <code className="mx-1 px-1 rounded bg-black/40">/deployments/{chainId}.json</code>
          exists in <code className="px-1 rounded bg-black/40">packages/web/public/deployments</code>.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">Loading question details...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">Question not found</div>
      </div>
    )
  }

  const canFinalize = question.lastAnswerTs > 0 && 
    Date.now() / 1000 > Number(question.lastAnswerTs) + Number(question.timeout) &&
    !question.finalized

  const minBond = question.bestBond > 0 ? BigInt(question.bestBond) * BigInt(2) : BigInt(1)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {gated && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300 px-4 py-3 text-sm">
            Please connect KaiaWallet to the correct network (Mainnet {KAIA_MAINNET_ID} or Kairos {KAIA_TESTNET_ID}).
          </div>
        )}
        <div className={`bg-white overflow-hidden shadow rounded-lg ${gated ? 'opacity-50' : ''}`}>
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold mb-6">Question Details</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Question ID</p>
                <p className="font-mono text-xs">{question.id}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{question.finalized ? 'Finalized' : 'Open'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Template</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-600">
                    Template info not available
                  </span>
                  <span className="text-xs text-gray-500">
                    (Template ID is not stored on-chain)
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Bond Token</p>
                <p className="font-medium">
                  {bondTokenInfo ? `${bondTokenInfo.label} (${bondTokenInfo.symbol})` : 'Native KAIA'}
                  {bondTokenInfo?.symbol === 'WKAIA' && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Wrapped KAIA)
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Timeout</p>
                <p>{question.timeout} seconds</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Current Best Answer</p>
                <p className="font-mono">{question.bestAnswer || 'None'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Current Best Bond</p>
                <p>{question.bestBond ? formatEther(question.bestBond) : '0'} {bondTokenInfo?.symbol || 'KAIA'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Minimum Next Bond</p>
                <p>{formatEther(minBond)} {bondTokenInfo?.symbol || 'KAIA'}</p>
              </div>
              
              {question.finalized && (
                <div className="p-4 bg-green-50 rounded-md">
                  <p className="text-sm font-medium text-green-800">Final Result</p>
                  <p className="font-mono text-green-900">{question.bestAnswer}</p>
                </div>
              )}
            </div>
            
            {!question.finalized && (
              <div className="mt-8 space-y-6">
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Submit Answer</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Answer (bytes32 or number)
                      </label>
                      <input
                        type="text"
                        value={answerForm.answer}
                        onChange={(e) => setAnswerForm({ ...answerForm, answer: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                        placeholder="1 for YES, 0 for NO, or custom bytes32"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Bond Amount (in tokens)
                      </label>
                      <input
                        type="text"
                        value={answerForm.bond}
                        onChange={(e) => setAnswerForm({ ...answerForm, bond: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                        placeholder={formatEther(minBond)}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Minimum: {formatEther(minBond)} {bondTokenInfo?.symbol || 'tokens'}
                      </p>
                      {feeQuote && bondTokenInfo && feeInfo && answerForm.bond && (
                        <FeeNotice
                          feeFormatted={feeQuote.feeFormatted}
                          totalFormatted={feeQuote.totalFormatted}
                          symbol={bondTokenInfo.symbol}
                          feeBps={feeInfo.feeBps}
                          feeRecipient={feeInfo.feeRecipient as `0x${string}`}
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isCommit"
                        checked={answerForm.isCommit}
                        onChange={(e) => setAnswerForm({ ...answerForm, isCommit: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isCommit" className="ml-2 block text-sm text-gray-900">
                        Use commit-reveal
                      </label>
                    </div>
                    
                    {answerForm.isCommit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nonce (for commit-reveal)
                        </label>
                        <input
                          type="text"
                          value={answerForm.nonce}
                          onChange={(e) => setAnswerForm({ ...answerForm, nonce: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                          placeholder="Secret nonce"
                        />
                      </div>
                    )}
                    
                    {/* Payment Mode Selector */}
                    {question.bondToken && answerForm.bond && (
                      <PaymentModeSelector
                        bondToken={question.bondToken as `0x${string}`}
                        bondAmount={bondTokenInfo?.decimals ? parseUnits(answerForm.bond, bondTokenInfo.decimals) : parseEther(answerForm.bond)}
                        feeAmount={feeInfo ? ((bondTokenInfo?.decimals ? parseUnits(answerForm.bond, bondTokenInfo.decimals) : parseEther(answerForm.bond)) * BigInt(feeInfo.feeBps)) / 10000n : 0n}
                        deployments={deployments}
                        onModeChange={setPaymentMode}
                        onWkaiaAmountChange={setWkaiaAmount}
                      />
                    )}
                    
                    <DisclaimerGate>
                      <div className="flex items-center justify-between gap-3">
                        <DisclaimerBadge compact />
                        <button
                          onClick={handleSubmitAnswer}
                          disabled={actionLoading || !address || gated}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? 'Submitting...' : 'Submit Answer'}
                        </button>
                      </div>
                    </DisclaimerGate>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Reveal Commitment</h3>
                  <p className="text-sm text-gray-500 mb-4">No fee required for revealing answers</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Answer
                      </label>
                      <input
                        type="text"
                        value={revealForm.answer}
                        onChange={(e) => setRevealForm({ ...revealForm, answer: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nonce
                      </label>
                      <input
                        type="text"
                        value={revealForm.nonce}
                        onChange={(e) => setRevealForm({ ...revealForm, nonce: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                      />
                    </div>
                    
                    <button
                      onClick={handleReveal}
                      disabled={actionLoading || !address || gated}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? 'Revealing...' : 'Reveal Answer'}
                    </button>
                  </div>
                </div>
                
                {canFinalize && (
                  <div className="border-t pt-6">
                    <button
                      onClick={handleFinalize}
                      disabled={actionLoading || !address || gated}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? 'Finalizing...' : 'Finalize Question'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
