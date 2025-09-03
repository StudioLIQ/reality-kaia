'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider, useChainId, useSwitchChain } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { kaiaMainnet, kaiaTestnet, CHAIN_LABEL } from '@/lib/viem'
import { ReactNode } from 'react'

const queryClient = new QueryClient()

const config = getDefaultConfig({
  appName: 'RealitioERC20',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [kaiaMainnet, kaiaTestnet],
  ssr: true,
})

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={kaiaMainnet}
        >
          <NetworkBadge />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function NetworkBadge() {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const isCorrectNetwork = chainId === 8217 || chainId === 1001
  const networkLabel = CHAIN_LABEL(chainId)
  const networkColor = chainId === 8217 ? 'bg-blue-500' : chainId === 1001 ? 'bg-gray-500' : 'bg-red-500'
  
  return (
    <div className="fixed top-4 left-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium ${networkColor} shadow-lg`}>
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>{networkLabel}</span>
        {!isCorrectNetwork && (
          <button
            onClick={() => switchChain({ chainId: 8217 })}
            className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-md text-xs"
          >
            Switch
          </button>
        )}
      </div>
    </div>
  )
}