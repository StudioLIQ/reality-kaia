'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useChainId, usePublicClient } from 'wagmi'
import { parseUnits, keccak256, toBytes } from 'viem'
import { 
  REALITIO_ERC20_ABI, 
  ERC20_ABI,
  getDeployedAddresses, 
  resolveBondTokens,
  resolveBondTokensWithStatus,
  calculateFee
} from '@/lib/contracts'
import { getDeployments } from '@/lib/deployments.generated'
import { USDT_MAINNET, type Addr } from '@/lib/viem'
import { TIMEOUT_PRESETS, unitSeconds, toUnix, toLocalInput, fromNow } from '@/lib/time'
import { networkStatus, KAIA_MAINNET_ID, KAIA_TESTNET_ID } from '@/lib/chain'
import { TOKENS_FOR, type BondToken } from '@/lib/tokens'
import { quoteFee } from '@/lib/fees'
import FeeNotice from '@/components/FeeNotice'
import TemplatePicker from '@/components/TemplatePicker'
import TokenSelector from '@/components/TokenSelector'
import DisclaimerBadge from '@/components/DisclaimerBadge'
import DisclaimerGate from '@/components/DisclaimerGate'
import { getAllowedTemplates } from '@/lib/templates'
import { useRouter } from 'next/navigation'


export default function CreateQuestion() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  
  const templates = getAllowedTemplates(chainId)
  const deployments = getDeployments(chainId)
  const availableTokens = TOKENS_FOR(chainId, deployments || {})
  
  const [templateId, setTemplateId] = useState<number | undefined>(templates[0]?.id)
  const [formData, setFormData] = useState({
    question: '',
    arbitrator: '',
  })
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

  const status = networkStatus(isConnected, chainId)
  const gated = (status === "NOT_CONNECTED" || status === "WRONG_NETWORK")

  useEffect(() => {
    const sec = Math.max(1, Math.floor(timeoutInput * unitSeconds[timeoutUnit]))
    setTimeoutSec(sec)
  }, [timeoutInput, timeoutUnit])

  // Calculate fee when bond amount changes
  useEffect(() => {
    async function calculateFeeQuote() {
      if (!bondToken || !publicClient || !bondAmount) return
      
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses?.realitioERC20) return
      
      try {
        const bondRaw = parseUnits(bondAmount || '0', bondToken.decimals)
        const quote = await quoteFee({
          client: publicClient,
          reality: addresses.realitioERC20 as Addr,
          bondTokenDecimals: bondToken.decimals,
          bondRaw,
          feeBpsFallback: feeInfo?.feeBps || 25
        })
        setFeeQuote({ feeFormatted: quote.feeFormatted, totalFormatted: quote.totalFormatted })
      } catch (err) {
        console.error('Error calculating fee:', err)
      }
    }
    
    calculateFeeQuote()
  }, [bondAmount, bondToken, publicClient, chainId, feeInfo])

  // Load fee info from deployments
  useEffect(() => {
    if (deployments?.feeBps && deployments?.feeRecipient) {
      setFeeInfo({
        feeBps: deployments.feeBps,
        feeRecipient: deployments.feeRecipient
      })
    }
  }, [deployments])

  useEffect(() => {
    async function checkAllowance() {
      if (!bondToken?.address || !address || !publicClient) return
      
      setCheckingAllowance(true)
      try {
        const addresses = await getDeployedAddresses(chainId)
        if (!addresses) return
        
        const allowanceValue = await publicClient.readContract({
          address: bondToken.address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, addresses.realitioERC20 as Addr],
        })
        
        setAllowance(allowanceValue as bigint)
      } catch (err) {
        console.error('Error checking allowance:', err)
      } finally {
        setCheckingAllowance(false)
      }
    }
    
    checkAllowance()
  }, [bondToken, address, publicClient, chainId])

  const handleApprove = async () => {
    if (!walletClient || !bondToken?.address || !address) return
    
    setLoading(true)
    setError('')
    
    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) throw new Error('Contract addresses not found')
      
      // Calculate total amount with fee
      const bondAmount = parseUnits('1000000', bondToken.decimals)
      const { total } = calculateFee(bondAmount, feeInfo?.feeBps || 25)
      const amount = total
      
      await walletClient.writeContract({
        address: bondToken.address,
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
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) {
        throw new Error('Contract addresses not found')
      }

      const randomValue = crypto.getRandomValues(new Uint8Array(32))
      const nonce = keccak256(randomValue)
      
      const arbitratorAddress = formData.arbitrator || addresses.arbitratorSimple
      const currentOpeningTs = useNow ? Math.floor(Date.now() / 1000) : openingTs

      const hash = await walletClient.writeContract({
        address: addresses.realitioERC20 as Addr,
        abi: REALITIO_ERC20_ABI,
        functionName: 'askQuestionERC20',
        args: [
          bondToken.address,
          Number(templateId),
          formData.question,
          arbitratorAddress as Addr,
          timeoutSec,
          currentOpeningTs,
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create New Question</h1>
        <p className="mt-2 text-sm text-white/60">Submit a question to the oracle network</p>
      </div>

      {gated && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300 px-4 py-3 text-sm">
          Please connect KaiaWallet to the correct network (Mainnet {KAIA_MAINNET_ID} or Kairos {KAIA_TESTNET_ID}).
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <form onSubmit={handleSubmit} className={`space-y-6 ${gated ? 'pointer-events-none opacity-50' : ''}`}>
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
            {bondToken && feeInfo && (
              <p className="mt-2 text-sm text-white/50">
                Fee: {(feeInfo.feeBps / 100).toFixed(2)}% (paid to {feeInfo.feeRecipient.slice(0, 6)}...{feeInfo.feeRecipient.slice(-4)})
              </p>
            )}
            {bondToken && allowance === BigInt(0) && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading || checkingAllowance || !bondToken.active}
                className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingAllowance ? 'Checking...' : 'Approve Token'}
              </button>
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


          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <DisclaimerGate>
            <div className="flex items-center justify-between gap-3">
              <DisclaimerBadge compact />
              <button
                type="submit"
                disabled={loading || !address || !bondToken || !templateId || allowance === BigInt(0) || gated || (bondToken && !bondToken.active)}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Question'}
              </button>
            </div>
          </DisclaimerGate>
        </form>
      </div>
    </div>
  )
}