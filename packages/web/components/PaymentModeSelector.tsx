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
}

export function PaymentModeSelector({ 
  bondToken, 
  bondAmount, 
  feeAmount, 
  deployments,
  onModeChange,
  onWkaiaAmountChange 
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
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Payment Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-600 dark:text-blue-400">Bond Amount:</span>
            <span className="font-mono">{formatUnits(bondAmount, 6)} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-600 dark:text-blue-400">Fee (0.25%):</span>
            <span className="font-mono">{formatUnits(feeAmount, 6)} USDT</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-blue-200 dark:border-blue-800">
            <span className="font-medium text-blue-900 dark:text-blue-100">Total:</span>
            <span className="font-mono font-medium">{formatUnits(total, 6)} USDT</span>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Payment Method
        </h3>
        
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
                  `${active ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                   ${checked && mode.available ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500' : 
                     mode.available ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 
                     'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'}
                   relative rounded-lg border px-4 py-3 cursor-pointer focus:outline-none`
                }
              >
                {({ checked }) => (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <RadioGroup.Label
                          as="p"
                          className={`font-medium ${
                            mode.available ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {mode.name}
                          {mode.id === 'permit2' && hasPermit2 && (
                            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                              Recommended
                            </span>
                          )}
                        </RadioGroup.Label>
                        <RadioGroup.Description
                          as="span"
                          className={`inline ${
                            mode.available ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'
                          }`}
                        >
                          <span>{mode.description}</span>
                        </RadioGroup.Description>
                      </div>
                    </div>
                    {checked && mode.available && (
                      <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
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
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
              Mixed Payment Configuration
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-amber-700 dark:text-amber-300 mb-1">
                  WKAIA Amount to Use (max: {formatUnits(total, 18)} WKAIA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formatUnits(total, 18)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : 0
                    const wkaiaBigInt = BigInt(Math.floor(value * 1e18))
                    setWkaiaAmount(wkaiaBigInt > total ? total : wkaiaBigInt)
                    onWkaiaAmountChange?.(wkaiaBigInt > total ? total : wkaiaBigInt)
                  }}
                />
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>WKAIA portion:</span>
                  <span className="font-mono">{formatUnits(wkaiaAmount, 18)} WKAIA</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>KAIA to wrap:</span>
                  <span className="font-mono">{formatUnits(total > wkaiaAmount ? total - wkaiaAmount : 0n, 18)} KAIA</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                The zapper will use your WKAIA first, then automatically wrap native KAIA for the remainder.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}