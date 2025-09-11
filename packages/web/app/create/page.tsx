'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useChainId, usePublicClient } from 'wagmi'
import { parseUnits, keccak256, toBytes, decodeEventLog, encodeAbiParameters } from 'viem'
import { 
  REALITIO_ERC20_ABI, 
  ERC20_ABI,
  resolveBondTokens,
  resolveBondTokensWithStatus,
  calculateFee
} from '@/lib/contracts'
import { realityAbi } from '@/lib/abi/reality'
import { realityV2Abi } from '@/lib/abi/realityV2'
import { realityV3Abi } from '@/lib/abi/realityV3'
import { useAddresses } from '@/lib/contracts.client'
import { USDT_MAINNET, type Addr } from '@/lib/viem'
import { TIMEOUT_PRESETS, unitSeconds, toUnix, toLocalInput, fromNow } from '@/lib/time'
import { networkStatus, KAIA_MAINNET_ID, KAIA_TESTNET_ID } from '@/lib/chain'
import { TOKENS_FOR, type BondToken } from '@/lib/tokens'
import { quoteFee } from '@/lib/fees'
// Zapper is used for answering flows only; not used for create
import FeeNotice from '@/components/FeeNotice'
import TemplatePicker from '@/components/TemplatePicker'
import TokenSelector from '@/components/TokenSelector'
import TokenStatusCard from '@/components/TokenStatusCard'
import DisclaimerGate from '@/components/DisclaimerGate'
import { getAllowedTemplates } from '@/lib/templates'
import { useRouter } from 'next/navigation'
import { bus } from '@/lib/bus'


export default function CreateQuestion() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { addr, deployments, ready: addrReady, loading: addrLoading, error: addrError, feeBps } = useAddresses()
  
  const templates = getAllowedTemplates(chainId)
  const availableTokens = TOKENS_FOR(chainId, deployments || {})
  
  const [templateId, setTemplateId] = useState<number | undefined>(templates[0]?.id)
  const [formData, setFormData] = useState({
    question: '',
    arbitrator: '',
    category: '',
    metadataURI: '',
  })
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [bondToken, setBondToken] = useState<BondToken | undefined>(
    availableTokens.find(t => t.label === 'USDT') || availableTokens[0]
  )
  const [timeoutSec, setTimeoutSec] = useState<number>(TIMEOUT_PRESETS[0].seconds)
  const [timeoutUnit, setTimeoutUnit] = useState<'s'|'m'|'h'|'d'>('h')
  const [timeoutInput, setTimeoutInput] = useState<number>(24)
  const [bondAmount, setBondAmount] = useState<string>('100')
  const [feeQuote, setFeeQuote] = useState<{ feeFormatted: string; totalFormatted: string } | null>(null)
  const [useNow, setUseNow] = useState(true)
  const [openingTs, setOpeningTs] = useState<number>(Math.floor(Date.now()/1000))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [allowance, setAllowance] = useState<bigint>(0n)
  const [checkingAllowance, setCheckingAllowance] = useState(false)
  const [feeInfo, setFeeInfo] = useState<{ feeBps: number; feeRecipient: string } | null>(null)
  // Remove unused state - use addr directly from useAddresses
  const [showCreateInfo, setShowCreateInfo] = useState(true)

  const status = networkStatus(isConnected, chainId)
  const gated = (status === "NOT_CONNECTED" || status === "WRONG_NETWORK")
  const depsReady = Boolean(addrReady && addr?.reality)

  useEffect(() => {
    // quick debug to help diagnose route issues
    console.debug('[create]', { chainId, reality: addr.reality, arbitrator: addr.arbitrator, zapper: addr.zapper });
  }, [chainId, addr.reality, addr.arbitrator, addr.zapper]);

  useEffect(() => {
    const sec = Math.max(1, Math.floor(timeoutInput * unitSeconds[timeoutUnit]))
    setTimeoutSec(sec)
  }, [timeoutInput, timeoutUnit])

  // Calculate fee when bond amount changes
  useEffect(() => {
    async function calculateFeeQuote() {
      if (!depsReady) return
      if (!bondToken || !publicClient || !bondAmount) return
      if (!addr.reality) return
      try {
        const bondRaw = parseUnits(bondAmount || '0', bondToken.decimals)
        const quote = await quoteFee({
          client: publicClient,
          reality: addr.reality as Addr,
          bondTokenDecimals: bondToken.decimals,
          bondRaw,
          feeBpsFallback: feeBps || 25
        })
        setFeeQuote({ feeFormatted: quote.feeFormatted, totalFormatted: quote.totalFormatted })
      } catch (err) {
        console.error('Error calculating fee:', err)
      }
    }
    calculateFeeQuote()
  }, [depsReady, bondAmount, bondToken?.decimals, bondToken?.address, publicClient, chainId, addr.reality, feeBps])

  // Load fee info from deployments and contract addresses
  useEffect(() => {
    if (deployments?.feeBps && deployments?.feeRecipient) {
      setFeeInfo({
        feeBps: deployments.feeBps,
        feeRecipient: deployments.feeRecipient
      })
    }
  }, [deployments?.feeBps, deployments?.feeRecipient])

  useEffect(() => {
    async function checkAllowance() {
      if (!depsReady) return
      if (!bondToken?.address || !address || !publicClient) return
      setCheckingAllowance(true)
      try {
        if (!addr.reality) return
        const allowanceValue = await publicClient.readContract({
          address: bondToken.address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, addr.reality as Addr],
        })
        setAllowance(allowanceValue as bigint)
      } catch (err) {
        console.error('Error checking allowance:', err)
      } finally {
        setCheckingAllowance(false)
      }
    }
    checkAllowance()
  }, [depsReady, bondToken?.address, address, publicClient, chainId, addr.reality])

  const handleApprove = async () => {
    if (!walletClient || !bondToken?.address || !address || !bondAmount) return
    if (!depsReady || !addr.reality) return
    
    setLoading(true)
    setError('')
    
    try {
      if (!addr.reality) throw new Error('Contract addresses not found')
      
      // Calculate total amount with fee for the actual bond amount
      const bondRaw = parseUnits(bondAmount, bondToken.decimals)
      const { total } = calculateFee(bondRaw, feeInfo?.feeBps || 25)
      
      // Approve the exact amount needed (including fee)
      const hash = await walletClient.writeContract({
        address: bondToken.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addr.reality as Addr, total],
        account: address,
      })
      
      // Wait for transaction confirmation
      if (publicClient && hash) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      
      setAllowance(total)
      // Trigger allowance re-check
      setTimeout(() => {
        checkAllowance()
      }, 1000)
    } catch (err: any) {
      console.error('Error approving:', err)
      setError(err.message || 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  const checkAllowance = async () => {
    if (!depsReady) return
    if (!bondToken?.address || !address || !publicClient) return
    
    try {
      if (!addr.reality) return
      
      const allowanceValue = await publicClient.readContract({
        address: bondToken.address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, addr.reality as Addr],
      })
      
      setAllowance(allowanceValue as bigint)
    } catch (err) {
      console.error('Error checking allowance:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletClient || !address || !bondToken?.address) {
      setError('Please connect your wallet and select a bond token')
      return
    }

    if (!bondToken.active) {
      setError('Please select an active bond token')
      return
    }

    if (!templateId) {
      setError('Please select a template')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (!addr.reality || !depsReady) {
        throw new Error('Contract addresses not found')
      }

      // Strengthen uniqueness: include current timestamp into the nonce entropy
      const randomValue = crypto.getRandomValues(new Uint8Array(32))
      const randHash = keccak256(randomValue)
      const nowSec = BigInt(Math.floor(Date.now() / 1000))
      const nonce = keccak256(
        encodeAbiParameters(
          [ { type: 'bytes32' }, { type: 'uint64' } ],
          [ randHash, nowSec ]
        )
      )
      
      const arbitratorAddress = formData.arbitrator || addr.arbitrator || deployments?.arbitratorSimple
      // Contract requires openingTs >= block.timestamp OR 0. For "Now", pass 0 to avoid race.
      const currentOpeningTs = useNow ? 0 : openingTs

      // Compute deterministic questionId (optimistic UI). Dynamic import avoids module issues.
      let computedQid: `0x${string}` | null = null
      try {
        const { encodeAbiParameters } = await import('viem')
        computedQid = keccak256(
          encodeAbiParameters(
            [
              { type: 'uint32' },
              { type: 'bytes32' },
              { type: 'address' },
              { type: 'uint32' },
              { type: 'uint32' },
              { type: 'bytes32' },
              { type: 'address' },
            ],
            [
              Number(templateId),
              keccak256(toBytes(formData.question)),
              arbitratorAddress as Addr,
              Math.floor(timeoutSec),
              Math.floor(currentOpeningTs),
              nonce,
              address,
            ]
          )
        ) as `0x${string}`
      } catch {}

      // Emit optimistic question creation immediately and persist in storage for next page
      if (computedQid) bus.emit({ chainId, questionId: computedQid })
      try {
        const key = 'oo:new-questions'
        const raw = localStorage.getItem(key)
        const list = raw ? JSON.parse(raw) as Array<{chainId:number;questionId:`0x${string}`}> : []
        if (computedQid) list.unshift({ chainId, questionId: computedQid })
        localStorage.setItem(key, JSON.stringify(list.slice(0, 50)))
        // Also set a one-time flash message for the dashboard
        const flashKey = 'oo:flash'
        if (computedQid) {
          const short = `${computedQid.slice(0,10)}...`
          localStorage.setItem(flashKey, JSON.stringify({
            message: `Question created: ${short}`,
            href: `/q/${computedQid}`,
            label: 'View'
          }))
        }
      } catch {}

      // Pack outcomes for multiple choice questions
      const SEP = "\u001F";
      const outcomesPacked = (templateId === 3 && outcomes.length) ? outcomes.join(SEP) : "";

      // Prefer V3 (which registers for pagination); fallback to V2, then V1
      let hash: `0x${string}`;
      let usedV3 = false;
      try {
        // Try V3 method
        hash = await walletClient.writeContract({
          address: addr.reality as Addr,
          abi: realityV3Abi as any,
          functionName: 'askQuestionERC20V3',
          args: [
            bondToken.address,
            Number(templateId),
            formData.question,
            outcomesPacked,
            arbitratorAddress as Addr,
            Math.floor(timeoutSec),
            Math.floor(currentOpeningTs),
            nonce,
            'en',
            formData.category || '',
            formData.metadataURI || ''
          ],
          account: address,
        });
        usedV3 = true;
      } catch (v3err) {
        try {
          // Fallback to V2: still creates question, but not auto-registered
          hash = await walletClient.writeContract({
            address: addr.reality as Addr,
            abi: realityV2Abi as any,
            functionName: 'askQuestionERC20Full',
            args: [
              bondToken.address,
              Number(templateId),
              formData.question,
              outcomesPacked,
              arbitratorAddress as Addr,
              Math.floor(timeoutSec),
              Math.floor(currentOpeningTs),
              nonce,
              'en',
              formData.category || '',
              formData.metadataURI || ''
            ],
            account: address,
          });
        } catch (error) {
          // Fallback to V1 (content only)
          console.log('V3/V2 failed, falling back to V1:', error);
          hash = await walletClient.writeContract({
            address: addr.reality as Addr,
            abi: REALITIO_ERC20_ABI,
            functionName: 'askQuestionERC20',
            args: [
              bondToken.address,
              Number(templateId),
              formData.question,
              arbitratorAddress as Addr,
              Math.floor(timeoutSec),
              Math.floor(currentOpeningTs),
              nonce,
            ],
            account: address,
          });
        }
      }

      // Fire-and-forget: wait for receipt and confirm optimistic questionId
      if (publicClient) {
        (async () => {
          try {
            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            // Decode questionId from logs robustly: filter by contract + event topic
            let qid: `0x${string}` | null = null
            const targetAddr = (addr.reality as string).toLowerCase()
            const topicNewQuestion = keccak256(toBytes('LogNewQuestion(bytes32,address,uint32,string,bytes32,address,uint32,uint32,bytes32,uint256)'))
            for (const log of receipt.logs) {
              const matchesAddr = (log.address || '').toLowerCase() === targetAddr
              const isNewQ = Array.isArray(log.topics) && log.topics[0] === topicNewQuestion
              if (!matchesAddr || !isNewQ) continue
              // topics[1] is indexed questionId
              if (log.topics[1]) { qid = log.topics[1] as `0x${string}`; break }
              // As a fallback, try decode with minimal ABI
              try {
                const decoded = decodeEventLog({ abi: realityAbi as any, data: log.data, topics: log.topics }) as any
                if (decoded?.eventName === 'LogNewQuestion' && decoded?.args?.questionId) {
                  qid = decoded.args.questionId as `0x${string}`
                  break
                }
              } catch {}
            }
            if (qid) {
              bus.emit({ chainId, questionId: qid })

              // If V3 wasn't used, attempt to register the question to make it visible in pagination
              if (!usedV3) {
                try {
                  await walletClient!.writeContract({
                    address: addr.reality as Addr,
                    abi: realityV3Abi as any,
                    functionName: 'registerExistingQuestion',
                    args: [qid],
                    account: address,
                  })
                } catch {}
              }
            }
          } catch {}
        })()
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error creating question:', err)
      setError(err.message || 'Failed to create question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 space-y-6">
      {/* sticky disclaimer bar (below header height ~56px) */}

      
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Create New Question</h1>
        <p className="mt-2 text-sm text-white/60">Submit a question to the oracle network</p>
        </div>

      {!addrLoading && (addrError || !addrReady) && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-300">
          Missing deployment info for chain {chainId}. Ensure 
          <code className="mx-1 px-1 rounded bg-black/40">/deployments/{chainId}.json</code>
          exists in <code className="px-1 rounded bg-black/40">packages/web/public/deployments</code>.
        </div>
      )}

      {showCreateInfo && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 flex items-start justify-between">
          <p>
            Creating a question does not transfer tokens. Approvals only set allowance; tokens are transferred when an answer is submitted with a bond.
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShowCreateInfo(false)}
            className="ml-3 inline-flex items-center justify-center rounded-md px-2 py-1 text-white/50 hover:text-white/80 hover:bg-white/10"
          >
            Dismiss
          </button>
        </div>
      )}

      {gated && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300 px-4 py-3 text-sm">
          Please connect KaiaWallet to Kairos testnet (chain {KAIA_TESTNET_ID}).
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <form onSubmit={handleSubmit} className={`space-y-6 ${(gated || !depsReady) ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Bond Token Section */}
          <section className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Bond Token
            </label>
                <TokenSelector 
                  tokens={availableTokens} 
                  value={bondToken} 
                  onChange={setBondToken} 
                />
            {bondToken && !bondToken.active && (
              <p className="text-xs text-red-400 mt-1">Selected token is not allowed. Choose an Active token.</p>
            )}
          </section>

          {/* Template Section */}
          <section>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Template
            </label>
                <TemplatePicker 
                  items={templates} 
                  value={templateId} 
                  onChange={setTemplateId} 
                />
            {!templateId && (
              <p className="mt-2 text-sm text-amber-400">Please select a template to continue.</p>
            )}
            <p className="mt-3 text-xs text-white/50">
              Only the templates listed above are supported. Need another template? Please contact an admin.
            </p>
          </section>

          {/* Question Section */}
          <section>
            <label htmlFor="question" className="block text-sm font-medium text-white/80">
              Question
            </label>
            <textarea
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none"
              placeholder="Will ETH price be above $3000 on 2025-01-01?"
              required
            />
          </section>

          {/* Outcomes Section (for Multiple Choice) */}
          {templateId === 3 && (
            <section>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Answer Choices
              </label>
              <div className="space-y-2">
                {outcomes.map((outcome, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={outcome}
                      onChange={(e) => {
                        const newOutcomes = [...outcomes]
                        newOutcomes[index] = e.target.value
                        setOutcomes(newOutcomes)
                      }}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none"
                      placeholder={`Choice ${String.fromCharCode(65 + index)}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newOutcomes = outcomes.filter((_, i) => i !== index)
                        setOutcomes(newOutcomes)
                      }}
                      className="px-3 py-2 rounded-lg border border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOutcomes([...outcomes, ''])}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                >
                  Add Choice
                </button>
              </div>
              <p className="mt-2 text-xs text-white/50">
                Add answer choices for multiple choice questions. Leave empty for other template types.
              </p>
            </section>
          )}

          {/* Category Section */}
          <section>
            <label htmlFor="category" className="block text-sm font-medium text-white/80">
              Category (optional)
            </label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none"
              placeholder="e.g., sports, politics, crypto"
            />
          </section>

          {/* Metadata URI Section */}
          <section>
            <label htmlFor="metadataURI" className="block text-sm font-medium text-white/80">
              Metadata URI (optional)
            </label>
            <input
              type="text"
              id="metadataURI"
              value={formData.metadataURI}
              onChange={(e) => setFormData({ ...formData, metadataURI: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none"
              placeholder="https://example.com/metadata.json"
            />
          </section>

          {/* Arbitrator Section */}
          <section>
            <label htmlFor="arbitrator" className="block text-sm font-medium text-white/80">
              Arbitrator Address (optional)
            </label>
            <input
              type="text"
              id="arbitrator"
              value={formData.arbitrator}
              onChange={(e) => setFormData({ ...formData, arbitrator: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none"
              placeholder="Leave empty to use default arbitrator"
            />
          </section>

          {/* Bond Amount Section */}
          <section>
            <label htmlFor="bondAmount" className="block text-sm font-medium text-white/80">
              Initial Bond Amount
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="bondAmount"
                value={bondAmount}
                onChange={(e) => setBondAmount(e.target.value)}
                className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-emerald-400/50 focus:bg-white/10 focus:outline-none pr-16"
                placeholder="100"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-white/50 sm:text-sm">{bondToken?.symbol || 'tokens'}</span>
              </div>
            </div>
            {feeQuote && bondToken && feeInfo && (
              <FeeNotice
                feeFormatted={feeQuote.feeFormatted}
                totalFormatted={feeQuote.totalFormatted}
                symbol={bondToken.symbol}
                feeBps={feeInfo.feeBps}
                feeRecipient={feeInfo.feeRecipient as `0x${string}`}
              />
            )}
            <p className="mt-2 text-xs text-white/50">
              Note: Creating a question does not transfer tokens. Approve only sets allowance; tokens move when an answer is submitted with a bond.
            </p>
          </section>

          {/* Timeout Section */}
          <section>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Timeout
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIMEOUT_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  className={`px-3 py-1.5 rounded-full border transition-colors text-sm ${timeoutSec === p.seconds ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/70 hover:border-white/20'}`}
                  onClick={() => { setTimeoutSec(p.seconds); setTimeoutInput(p.seconds/3600); setTimeoutUnit('h'); }}
                >
                  {p.label}
                </button>
              ))}
              <span className={`px-3 py-1.5 text-xs rounded-full ${TIMEOUT_PRESETS.some(p => p.seconds === timeoutSec) ? 'opacity-40' : 'bg-white/10'} text-white/50`}>Custom</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={timeoutInput}
                onChange={e => setTimeoutInput(Number(e.target.value || 1))}
                className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
              <select
                value={timeoutUnit}
                onChange={e => setTimeoutUnit(e.target.value as any)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                <option value="s">Seconds</option>
                <option value="m">Minutes</option>
                <option value="h">Hours</option>
                <option value="d">Days</option>
              </select>
              <span className="text-xs text-white/50">= {timeoutSec.toLocaleString()} sec</span>
            </div>
          </section>

          {/* Opening Timestamp Section */}
          <section>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Opening Timestamp
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={useNow}
                  onChange={e => {
                    const v = e.target.checked;
                    setUseNow(v);
                    if (v) setOpeningTs(Math.floor(Date.now()/1000));
                  }}
                  className="rounded border-white/20 bg-white/5 text-emerald-400 focus:ring-emerald-400/50"
                />
                Now
              </label>
              {!useNow && (
                <input
                  type="datetime-local"
                  defaultValue={toLocalInput(openingTs)}
                  onChange={(e) => setOpeningTs(toUnix(e.target.value))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                />
              )}
              <span className="text-xs text-white/50">unix: {openingTs}</span>
            </div>
          </section>

          {/* Token Status Card */}
          {bondToken && bondAmount && isConnected && addr.reality && (
            <TokenStatusCard
              token={bondToken}
              requiredAmount={feeQuote?.totalFormatted || bondAmount}
              contractAddress={addr.reality as `0x${string}`}
              onApprove={handleApprove}
              approving={loading}
            />
          )}

          {/* Submit Button Section */}
          <DisclaimerGate>
            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={
                  loading || 
                  !address || 
                  !bondToken || 
                  !templateId || 
                  !bondAmount ||
                  parseFloat(bondAmount) <= 0 ||
                  (bondToken?.label !== 'WKAIA' && allowance === BigInt(0)) || 
                  gated || 
                  (bondToken && !bondToken.active)
                }
                aria-busy={loading ? 'true' : 'false'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"/>
                  </svg>
                )}
                <span>{loading ? 'Creating…' : 'Create Question'}</span>
              </button>
              <p className="text-xs text-white/50 md:text-right">
                No tokens move on creation; spending occurs on answer.
              </p>
            </div>
          </DisclaimerGate>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
