'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi'
import { formatEther, parseEther, parseUnits, formatUnits, keccak256, toHex, pad, encodeAbiParameters, parseAbiParameters } from 'viem'
import { REALITIO_ABI, ERC20_ABI, resolveBondTokens, type BondToken } from '@/lib/contracts'
import { realityV2Abi } from '@/lib/abi/realityV2'
import { realityV3Abi } from '@/lib/abi/realityV3'
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

export default function QuestionDetail(props: { params: Promise<{ id: string }> }) {
  const [questionId, setQuestionId] = useState<`0x${string}` | null>(null)
  
  useEffect(() => {
    props.params.then(p => setQuestionId(p.id as `0x${string}`))
  }, [props.params])
  
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { addr, deployments, ready: addrReady, loading: addrLoading, error: addrError, feeBps } = useAddresses()
  
  const status = networkStatus(isConnected, chainId)
  const gated = (status === "NOT_CONNECTED" || status === "WRONG_NETWORK")
  
  const [question, setQuestion] = useState<any>(null)
  const [questionMetadata, setQuestionMetadata] = useState<any>(null)
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
  const [copiedBest, setCopiedBest] = useState(false)

  const loadQuestion = useCallback(async () => {
    if (!publicClient || !questionId) return
    
    try {
      if (!addr.reality) { setLoading(false); return }

      // Try to get V3 metadata first, then V2, then V1
      let questionData: any
      let metadata: any = null
      
      try {
        // Try V3 getQuestionFullV3 which returns full metadata with runtime
        const v3Data = await publicClient.readContract({
          address: addr.reality as `0x${string}`,
          abi: realityV3Abi as any,
          functionName: 'getQuestionFullV3',
          args: [questionId],
        }) as any
        
        // V3 returns a struct with all fields
        metadata = {
          asker: v3Data.asker,
          arbitrator: v3Data.arbitrator,
          bondToken: v3Data.bondToken,
          templateId: v3Data.templateId,
          timeout: v3Data.timeout,
          openingTs: v3Data.openingTs,
          contentHash: v3Data.contentHash,
          createdAt: v3Data.createdAt,
          content: v3Data.content,
          outcomesPacked: v3Data.outcomesPacked,
          language: v3Data.language,
          category: v3Data.category,
          metadataURI: v3Data.metadataURI,
          lastAnswerTs: v3Data.lastAnswerTs,
          bestAnswer: v3Data.bestAnswer,
          bestBond: v3Data.bestBond,
          finalized: v3Data.finalized,
          pendingArbitration: v3Data.pendingArbitration,
        }
        
        // Map to legacy format for compatibility
        questionData = [
          v3Data.arbitrator,
          v3Data.bondToken,
          v3Data.timeout,
          v3Data.openingTs,
          v3Data.contentHash,
          v3Data.bestAnswer,
          v3Data.bestBond,
          '0x0000000000000000000000000000000000000000', // bestAnswerer not in V3, use zero address
          v3Data.lastAnswerTs,
          v3Data.finalized,
        ]
      } catch (v3Error) {
        try {
          // Try V2 getQuestionFull
          const v2Data = await publicClient.readContract({
            address: addr.reality as `0x${string}`,
            abi: realityV2Abi as any,
            functionName: 'getQuestionFull',
            args: [questionId],
          }) as any
          
          questionData = v2Data
          metadata = {
            asker: v2Data[0],
            arbitrator: v2Data[1],
            bondToken: v2Data[2],
            templateId: v2Data[3],
            timeout: v2Data[4],
            openingTs: v2Data[5],
            contentHash: v2Data[6],
            createdAt: v2Data[7],
            content: v2Data[8],
            outcomesPacked: v2Data[9],
            language: v2Data[10],
            category: v2Data[11],
            metadataURI: v2Data[12],
          }
        } catch (v2Error) {
          // Fallback to V1
          console.log('V3/V2 failed, using V1:', v2Error)
          questionData = await publicClient.readContract({
            address: addr.reality as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'getQuestion',
            args: [questionId],
          })
        }
      }

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
      setQuestionMetadata(metadata)
      
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
    bondToken: (question?.bondToken || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    realitioAddress: (addr.reality || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    permit2Address: (deploymentsState?.PERMIT2 || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    chainId
  })
  
  const { signPermit2612 } = usePermit2612({
    bondToken: (question?.bondToken || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    realitioAddress: (addr.reality || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    chainId
  })
  
  // Calculate fee when bond amount changes
  useEffect(() => {
    async function calculateFeeQuote() {
      if (!bondTokenInfo || !publicClient || !answerForm.bond || !addr.reality) return
      
      try {
        const bondRaw = bondTokenInfo?.decimals
          ? parseUnits(answerForm.bond || '0', bondTokenInfo.decimals)
          : parseEther(answerForm.bond || '0')
        
        const quote = await quoteFee({
          client: publicClient,
          reality: addr.reality as `0x${string}`,
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
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-r-transparent" />
            <p className="mt-4 text-white/60">Loading question details…</p>
          </div>
        </div>
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

  const toBigIntSafe = (v: any): bigint => {
    try {
      if (typeof v === 'bigint') return v
      if (typeof v === 'number') return BigInt(v)
      if (typeof v === 'string') return v ? BigInt(v) : 0n
      return 0n
    } catch { return 0n }
  }

  const bestBondRaw = toBigIntSafe(question.bestBond)
  const minBond = bestBondRaw > 0n ? bestBondRaw * 2n : 1n
  const tokenDecimals = bondTokenInfo?.decimals || 18
  const tokenSymbol = bondTokenInfo?.symbol || 'KAIA'

  const bestBondFormatted = formatUnits(bestBondRaw, tokenDecimals)
  const minBondFormatted = formatUnits(minBond, tokenDecimals)

  const bestAnswerHex = (question.bestAnswer || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`
  const isNoAnswer = /^0x0+$/.test(bestAnswerHex.slice(2))
  const templateIdNum = Number(questionMetadata?.templateId || 0)
  const outcomes = (questionMetadata?.outcomesPacked ? String(questionMetadata.outcomesPacked).split('\u001F') : []) as string[]
  const formatBestAnswer = (): { label: string; meta?: string } => {
    if (isNoAnswer) return { label: 'No answers yet' }
    let n: bigint | null = null
    try { n = BigInt(bestAnswerHex) } catch { n = null }
    if (templateIdNum === 1) {
      if (n === 1n) return { label: 'YES' }
      if (n === 0n) return { label: 'NO' }
    }
    if (templateIdNum === 3 && n !== null) {
      const idx = Number(n)
      if (idx >= 0 && idx < outcomes.length) {
        const letter = String.fromCharCode(65 + idx)
        return { label: `${letter}) ${outcomes[idx]}` }
      }
    }
    if (templateIdNum === 4 && n !== null) {
      return { label: n.toString() }
    }
    if (templateIdNum === 5 && n !== null) {
      const ts = Number(n)
      if (Number.isFinite(ts) && ts > 0) return { label: new Date(ts * 1000).toLocaleString(), meta: `${ts}` }
    }
    // text / unknown: show short hash
    return { label: `${bestAnswerHex.slice(0, 10)}…`, meta: 'bytes32' }
  }
  const bestAnswerDisplay = formatBestAnswer()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="">
        {gated && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300 px-4 py-3 text-sm">
            Please connect KaiaWallet to Kairos testnet (chain {KAIA_TESTNET_ID}).
          </div>
        )}
        {!addr.reality && (
          <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 text-red-300 px-4 py-3 text-sm">
            Missing Realitio contract address for this network. Please check deployments.
          </div>
        )}
        <div className={`rounded-2xl border border-white/10 bg-neutral-950 p-6 ${gated ? 'opacity-50' : ''}`}>
          <div className="">
            <h2 className="text-2xl font-bold text-white">Question Details</h2>
            <p className="mt-1 text-sm text-white/60">Review and answer the question below</p>
            <div className="h-px w-full bg-white/10 my-6" />
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/60">Question ID</p>
                <p className="font-mono text-xs text-white/90 break-all">{question.id}</p>
              </div>
              
              {/* Question Content */}
              {questionMetadata?.content && (
                <div>
                  <p className="text-sm text-white/60">Question</p>
                  <div className="mt-1 p-3 bg-white/5 rounded-md border border-white/10">
                    <p className="text-sm whitespace-pre-wrap text-white/90">{questionMetadata.content}</p>
                  </div>
                </div>
              )}
              
              {/* Answer Choices (for Multiple Choice) */}
              {questionMetadata?.outcomesPacked && questionMetadata.outcomesPacked.length > 0 && (
                <div>
                  <p className="text-sm text-white/60">Answer Choices</p>
                  <div className="mt-1 space-y-1">
                    {questionMetadata.outcomesPacked.split('\u001F').map((choice: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10">
                        <span className="text-xs font-medium text-white/60 w-6">{String.fromCharCode(65 + index)})</span>
                        <span className="text-sm text-white/90">{choice}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm text-white/60">Status</p>
                <p className="font-medium text-white">{question.finalized ? 'Finalized' : 'Open'}</p>
              </div>
              
              <div>
                <p className="text-sm text-white/60">Template</p>
                <div className="flex items-center gap-2">
                  {questionMetadata?.templateId ? (
                    <>
                      <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-xs text-blue-300">
                        Template {questionMetadata.templateId}
                      </span>
                      {questionMetadata.templateId === 3 && (
                        <span className="text-xs text-white/60">(Multiple Choice)</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
                        Template info not available
                      </span>
                      <span className="text-xs text-white/60">
                        (Template ID is not stored on-chain)
                      </span>
                    </>
                  )}
                </div>

                {/* Template info panel */}
                {questionMetadata?.templateId && (() => {
                  const spec = TEMPLATES.find(t => t.id === Number(questionMetadata.templateId));
                  if (!spec) return null;
                  return (
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/80 font-medium">{spec.label}</span>
                        {spec.badges?.map((b, i) => (
                          <span key={i} className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300">{b}</span>
                        ))}
                      </div>
                      <p className="text-white/60 mb-2">{spec.summary}</p>
                      {spec.details?.length > 0 && (
                        <ul className="list-disc ml-5 text-white/70 space-y-1">
                          {spec.details.map((d, i) => (<li key={i}>{d}</li>))}
                        </ul>
                      )}
                      {spec.sample && (
                        <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-2">
                          <p className="text-[11px] uppercase tracking-wide text-white/50 mb-1">Example</p>
                          <pre className="whitespace-pre-wrap text-white/80 text-xs">{spec.sample}</pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Category */}
              {questionMetadata?.category && (
                <div>
                  <p className="text-sm text-white/60">Category</p>
                  <p className="font-medium text-white">{questionMetadata.category}</p>
                </div>
              )}
              
              {/* Language */}
              {questionMetadata?.language && (
                <div>
                  <p className="text-sm text-white/60">Language</p>
                  <p className="font-medium text-white">{questionMetadata.language}</p>
                </div>
              )}
              
              {/* Metadata URI */}
              {questionMetadata?.metadataURI && (
                <div>
                  <p className="text-sm text-white/60">Metadata URI</p>
                  <a 
                    href={questionMetadata.metadataURI} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 text-sm break-all"
                  >
                    {questionMetadata.metadataURI}
                  </a>
                </div>
              )}
              
              <div>
                <p className="text-sm text-white/60">Bond Token</p>
                <p className="font-medium text-white">
                  {bondTokenInfo ? `${bondTokenInfo.label} (${bondTokenInfo.symbol})` : 'Native KAIA'}
                  {bondTokenInfo?.symbol === 'WKAIA' && (
                    <span className="ml-2 text-xs text-white/60">
                      (Wrapped KAIA)
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-white/60">Timeout</p>
                <p className="text-white/90">{question.timeout} seconds</p>
              </div>
              
              <div>
                <p className="text-sm text-white/60">Best Answer</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs">
                    {bestAnswerDisplay.label}
                  </span>
                  {bestAnswerDisplay.meta && (
                    <span className="text-xs text-white/50">{bestAnswerDisplay.meta}</span>
                  )}
                  {bestAnswerDisplay.meta === 'bytes32' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(bestAnswerHex); } catch {}
                        setCopiedBest(true); setTimeout(() => setCopiedBest(false), 1200)
                      }}
                      className="inline-flex items-center px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/70 hover:text-white text-[11px]"
                      title="Copy raw bytes32"
                    >
                      📋 {copiedBest ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-white/60">Best Bond</p>
                <p className="text-white/90">{bestBondFormatted} {tokenSymbol}</p>
              </div>
              
              <div>
                <p className="text-sm text-white/60">Minimum Next Bond</p>
                <p className="text-white/90">{minBondFormatted} {tokenSymbol}</p>
              </div>
              
              {question.finalized && (
                <div className="p-4 rounded-md bg-emerald-400/10 border border-emerald-400/30">
                  <p className="text-sm font-medium text-emerald-300">Final Result</p>
                  <p className="font-mono text-emerald-200 break-all">{question.bestAnswer}</p>
                </div>
              )}
            </div>
            
            {!question.finalized && (
              <div className="mt-8 space-y-6">
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 text-white">Submit Answer</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80">
                        Answer (bytes32 or number)
                      </label>
                      <input
                        type="text"
                        value={answerForm.answer}
                        onChange={(e) => setAnswerForm({ ...answerForm, answer: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white sm:text-sm"
                        placeholder={(() => {
                          const spec = questionMetadata?.templateId ? TEMPLATES.find(t => t.id === Number(questionMetadata.templateId)) : null;
                          if (spec?.answerType === 'binary') return 'Enter 1 for YES, 0 for NO';
                          if (spec?.answerType === 'multi') return 'Enter choice index (A=0, B=1, …)';
                          if (spec?.answerType === 'integer') return 'Enter integer value (e.g., 42)';
                          if (spec?.answerType === 'datetime') return 'Enter Unix timestamp in seconds (UTC)';
                          if (spec?.answerType === 'text') return 'Enter bytes32 (e.g., keccak256 of text)';
                          return '1 for YES, 0 for NO, or bytes32';
                        })()}
                      />
                      {/* Quick-select chips for common templates */}
                      {(() => {
                        const tid = questionMetadata?.templateId ? Number(questionMetadata.templateId) : undefined;
                        if (tid === 1) {
                          const isYes = answerForm.answer === '1';
                          const isNo = answerForm.answer === '0';
                          return (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setAnswerForm({ ...answerForm, answer: '1' })}
                                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${isYes ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/70 hover:border-white/20'}`}
                                aria-pressed={isYes}
                              >
                                YES (1)
                              </button>
                              <button
                                type="button"
                                onClick={() => setAnswerForm({ ...answerForm, answer: '0' })}
                                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${isNo ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/70 hover:border-white/20'}`}
                                aria-pressed={isNo}
                              >
                                NO (0)
                              </button>
                            </div>
                          );
                        }
                        if (tid === 3 && questionMetadata?.outcomesPacked) {
                          const choices = String(questionMetadata.outcomesPacked).split('\u001F');
                          return (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {choices.map((c, i) => {
                                const selected = answerForm.answer === String(i);
                                const label = String.fromCharCode(65 + i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    title={`${label}) ${c}`}
                                    onClick={() => setAnswerForm({ ...answerForm, answer: String(i) })}
                                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${selected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/70 hover:border-white/20'}`}
                                    aria-pressed={selected}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <p className="mt-1 text-xs text-white/60">
                        {(() => {
                          const spec = questionMetadata?.templateId ? TEMPLATES.find(t => t.id === Number(questionMetadata.templateId)) : null;
                          if (!spec) return 'Provide a numeric answer or a 32-byte hex value.';
                          switch (spec.answerType) {
                            case 'binary':
                              return 'Guide: answer 1 = YES, 0 = NO.';
                            case 'multi':
                              return 'Guide: answer the choice index (A=0, B=1, C=2, …).';
                            case 'integer':
                              return 'Guide: answer must be an integer (units defined in question).';
                            case 'datetime':
                              return 'Guide: answer is a Unix timestamp in seconds (UTC).';
                            case 'text':
                              return 'Guide: answer as bytes32 (e.g., keccak256(normalized text)) per question rules.';
                            default:
                              return 'Provide a numeric answer or a 32-byte hex value.';
                          }
                        })()}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80">
                        Bond Amount (in tokens)
                      </label>
                      <input
                        type="text"
                        value={answerForm.bond}
                        onChange={(e) => setAnswerForm({ ...answerForm, bond: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white sm:text-sm"
                        placeholder={formatEther(minBond)}
                      />
                      <p className="mt-1 text-sm text-white/60">
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
                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-400 focus:ring-emerald-400/50"
                      />
                      <label htmlFor="isCommit" className="ml-2 block text-sm text-white/80">
                        Use commit-reveal
                      </label>
                    </div>
                    
                    {answerForm.isCommit && (
                      <div>
                        <label className="block text-sm font-medium text-white/80">
                          Nonce (for commit-reveal)
                        </label>
                        <input
                          type="text"
                          value={answerForm.nonce}
                          onChange={(e) => setAnswerForm({ ...answerForm, nonce: e.target.value })}
                          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white sm:text-sm"
                          placeholder="Secret nonce"
                        />
                        <p className="mt-1 text-xs text-white/60">
                          Keep this secret. Save it; you will need the exact same nonce to reveal later.
                        </p>
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
                        decimals={bondTokenInfo?.decimals || 18}
                        symbol={bondTokenInfo?.symbol || 'TOKEN'}
                      />
                    )}
                    
                    <DisclaimerGate>
                      <div className="flex items-center justify-between gap-3">
                        <DisclaimerBadge compact />
                        <button
                          onClick={handleSubmitAnswer}
                          disabled={actionLoading || !address || gated || !addr.reality || (paymentMode === 'permit2' && !deployments?.PERMIT2)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? 'Submitting...' : 'Submit Answer'}
                        </button>
                      </div>
                    </DisclaimerGate>
                    {(!addr.reality || (paymentMode === 'permit2' && !deployments?.PERMIT2)) && (
                      <div className="mt-2 text-xs text-red-300">
                        {!addr.reality && <p>Missing Realitio contract address for this network.</p>}
                        {paymentMode === 'permit2' && !deployments?.PERMIT2 && (
                          <p>Permit2 is not available on this network. Choose another method.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 text-white">Reveal Commitment</h3>
                  <p className="text-sm text-white/60 mb-4">No fee required for revealing answers</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80">
                        Answer
                      </label>
                      <input
                        type="text"
                        value={revealForm.answer}
                        onChange={(e) => setRevealForm({ ...revealForm, answer: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white sm:text-sm"
                        placeholder={(() => {
                          const spec = questionMetadata?.templateId ? TEMPLATES.find(t => t.id === Number(questionMetadata.templateId)) : null;
                          if (spec?.answerType === 'binary') return 'Enter 1 for YES, 0 for NO';
                          if (spec?.answerType === 'multi') return 'Enter choice index (A=0, B=1, …)';
                          if (spec?.answerType === 'integer') return 'Enter integer value (e.g., 42)';
                          if (spec?.answerType === 'datetime') return 'Enter Unix timestamp in seconds (UTC)';
                          if (spec?.answerType === 'text') return 'Enter bytes32 (e.g., keccak256 of text)';
                          return '1 for YES, 0 for NO, or bytes32';
                        })()}
                      />
                      <p className="mt-1 text-xs text-white/60">
                        {(() => {
                          const spec = questionMetadata?.templateId ? TEMPLATES.find(t => t.id === Number(questionMetadata.templateId)) : null;
                          if (!spec) return 'Provide the same numeric or 32-byte hex value used at commit time.';
                          switch (spec.answerType) {
                            case 'binary':
                              return 'Guide: reveal 1 = YES, 0 = NO (must match your committed value).';
                            case 'multi':
                              return 'Guide: reveal the choice index (A=0, B=1, …) matching your commit.';
                            case 'integer':
                              return 'Guide: reveal the exact integer value (units per question).';
                            case 'datetime':
                              return 'Guide: reveal the Unix timestamp in seconds (UTC).';
                            case 'text':
                              return 'Guide: reveal as bytes32 (e.g., keccak256(normalized text)) as specified.';
                            default:
                              return 'Provide the same numeric or 32-byte hex value used at commit time.';
                          }
                        })()}
                      </p>
                      {/* Quick-select chips for reveal */}
                      {(() => {
                        const tid = questionMetadata?.templateId ? Number(questionMetadata.templateId) : undefined;
                        if (tid === 1) {
                          const isYes = revealForm.answer === '1';
                          const isNo = revealForm.answer === '0';
                          return (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setRevealForm({ ...revealForm, answer: '1' })}
                                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${isYes ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/70 hover:border-white/20'}`}
                                aria-pressed={isYes}
                              >
                                YES (1)
                              </button>
                              <button
                                type="button"
                                onClick={() => setRevealForm({ ...revealForm, answer: '0' })}
                                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${isNo ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/70 hover:border-white/20'}`}
                                aria-pressed={isNo}
                              >
                                NO (0)
                              </button>
                            </div>
                          );
                        }
                        if (tid === 3 && questionMetadata?.outcomesPacked) {
                          const choices = String(questionMetadata.outcomesPacked).split('\u001F');
                          return (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {choices.map((c, i) => {
                                const selected = revealForm.answer === String(i);
                                const label = String.fromCharCode(65 + i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    title={`${label}) ${c}`}
                                    onClick={() => setRevealForm({ ...revealForm, answer: String(i) })}
                                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${selected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/70 hover:border-white/20'}`}
                                    aria-pressed={selected}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80">
                        Nonce
                      </label>
                      <input
                        type="text"
                        value={revealForm.nonce}
                        onChange={(e) => setRevealForm({ ...revealForm, nonce: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white sm:text-sm"
                        placeholder="Exact nonce used during commit"
                      />
                      <p className="mt-1 text-xs text-white/60">
                        Must match the nonce used at commit time. Otherwise the reveal will fail.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleReveal}
                      disabled={actionLoading || !address || gated}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? 'Finalizing...' : 'Finalize Question'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
