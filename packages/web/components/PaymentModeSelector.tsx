'use client'

import { RadioGroup } from '@headlessui/react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import { useContractRead, usePublicClient } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'

export type PaymentMode = 'permit2' | 'permit2612' | 'approve' | 'mixed'

interface PaymentModeOption {
  id: PaymentMode
  name: string
  description: string
  transactions: number
  available: boolean
}

interface PaymentModeSelectorProps {
  bondToken: `0x${string}`
  bondAmount: bigint
  feeAmount: bigint
  deployments: any
  onModeChange: (mode: PaymentMode) => void
  onWkaiaAmountChange?: (amount: bigint) => void
  decimals?: number
  symbol?: string
}

export function PaymentModeSelector({ 
  bondToken, 
  bondAmount, 
  feeAmount, 
  deployments,
  onModeChange,
  onWkaiaAmountChange,
  decimals = 18,
  symbol = 'TOKEN'
}: PaymentModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('permit2')
  const [wkaiaAmount, setWkaiaAmount] = useState<bigint>(0n)
  const publicClient = usePublicClient()
  
  // Check if token supports EIP-2612
  const [supportsPermit2612, setSupportsPermit2612] = useState(false)
  
  useEffect(() => {
    async function checkPermit2612Support() {
      if (!publicClient || !bondToken) return
      
      try {
        // Try to call DOMAIN_SEPARATOR (EIP-2612 tokens have this)
        await publicClient.readContract({
          address: bondToken,
          abi: [{
            name: 'DOMAIN_SEPARATOR',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'bytes32' }]
          }],
          functionName: 'DOMAIN_SEPARATOR'
        })
        setSupportsPermit2612(true)
      } catch {
        setSupportsPermit2612(false)
      }
    }
    
    checkPermit2612Support()
  }, [bondToken, publicClient])
  
  const hasPermit2 = Boolean(deployments?.PERMIT2)
  const hasZapper = Boolean(deployments?.zapperWKAIA)
  const isWKAIA = bondToken?.toLowerCase() === deployments?.WKAIA?.toLowerCase()
  
  const paymentModes: PaymentModeOption[] = [
    {
      id: 'permit2',
      name: 'Permit2',
      description: 'Sign off-chain, submit in 1 transaction (recommended)',
      transactions: 1,
      available: hasPermit2
    },
    {
      id: 'permit2612',
      name: 'Permit (EIP-2612)',
      description: 'Sign off-chain, submit in 1 transaction',
      transactions: 1,
      available: supportsPermit2612
    },
    {
      id: 'approve',
      name: 'Traditional Approve',
      description: 'Approve first, then submit (2 transactions)',
      transactions: 2,
      available: true
    },
    {
      id: 'mixed',
      name: 'Mixed (WKAIA + KAIA)',
      description: 'Use WKAIA first, auto-wrap KAIA for remainder',
      transactions: 1,
      available: isWKAIA && hasZapper
    }
  ]
  
  // Find first available mode
  useEffect(() => {
    const firstAvailable = paymentModes.find(m => m.available)?.id || 'approve'
    setSelectedMode(firstAvailable)
    onModeChange(firstAvailable)
  }, [hasPermit2, supportsPermit2612])
  
  const total = bondAmount + feeAmount
  
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white mb-2">Payment Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Bond Amount:</span>
            <span className="font-mono text-white/90">{formatUnits(bondAmount, decimals)} {symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Fee:</span>
            <span className="font-mono text-white/90">{formatUnits(feeAmount, decimals)} {symbol}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-white/10">
            <span className="font-medium text-white">Total:</span>
            <span className="font-mono font-medium text-white/90">{formatUnits(total, decimals)} {symbol}</span>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Payment Method</h3>
        {!hasPermit2 && (
          <div className="mb-3 rounded-md border border-amber-400/30 bg-amber-400/10 text-amber-300 px-3 py-2 text-xs">
            Permit2 address missing on this network; Permit2 option is disabled.
          </div>
        )}
        
        <RadioGroup value={selectedMode} onChange={(value) => {
          setSelectedMode(value)
          onModeChange(value)
        }}>
          <div className="space-y-2">
            {paymentModes.map((mode) => (
              <RadioGroup.Option
                key={mode.id}
                value={mode.id}
                disabled={!mode.available}
                className={({ active, checked }) =>
                  `${active ? 'ring-2 ring-emerald-400/40' : ''}
                   ${checked && mode.available ? 'bg-emerald-400/10 border-emerald-400/30' : 
                     mode.available ? 'bg-white/5 border-white/10' : 
                     'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'}
                   relative rounded-lg border px-4 py-3 cursor-pointer focus:outline-none`
                }
              >
                {({ checked }) => (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <RadioGroup.Label
                          as="p"
                          className={`font-medium ${mode.available ? 'text-white' : 'text-white/50'}`}
                        >
                          {mode.name}
                          {mode.id === 'permit2' && hasPermit2 && (
                            <span className="ml-2 text-xs border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 px-2 py-0.5 rounded">
                              Recommended
                            </span>
                          )}
                        </RadioGroup.Label>
                        <RadioGroup.Description
                          as="span"
                          className={`inline ${mode.available ? 'text-white/60' : 'text-white/40'}`}
                        >
                          <span>{mode.description}</span>
                        </RadioGroup.Description>
                      </div>
                    </div>
                    {checked && mode.available && (
                      <div className="flex-shrink-0 text-emerald-300">
                        <CheckCircleIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
        
        {selectedMode === 'mixed' && isWKAIA && (
          <div className="mt-4 p-4 rounded-lg border border-amber-400/30 bg-amber-400/10">
            <h4 className="text-sm font-medium text-amber-300 mb-2">Mixed Payment Configuration</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-amber-300 mb-1">
                  WKAIA Amount to Use (max: {formatUnits(total, 18)} WKAIA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formatUnits(total, 18)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white"
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : 0
                    const wkaiaBigInt = BigInt(Math.floor(value * 1e18))
                    setWkaiaAmount(wkaiaBigInt > total ? total : wkaiaBigInt)
                    onWkaiaAmountChange?.(wkaiaBigInt > total ? total : wkaiaBigInt)
                  }}
                />
              </div>
              <div className="text-sm space-y-1 text-white/70">
                <div className="flex justify-between">
                  <span>From WKAIA:</span>
                  <span className="font-mono text-white/90">{formatUnits(wkaiaAmount, 18)} WKAIA</span>
                </div>
                <div className="flex justify-between">
                  <span>From KAIA:</span>
                  <span className="font-mono text-white/90">{formatUnits(total > wkaiaAmount ? total - wkaiaAmount : 0n, 18)} KAIA</span>
                </div>
              </div>
              <p className="text-xs text-amber-300">The zapper uses WKAIA first, then wraps native KAIA for the remainder.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
