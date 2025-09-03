'use client'

import { WagmiProvider, useAccount, useChainId, useSwitchChain, useConnect, useDisconnect } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import { networkStatus, chainLabel, KAIA_MAINNET_ID, KAIA_TESTNET_ID } from '@/lib/chain'
import { ReactNode, useState } from 'react'
import { ConnectKitButton } from '@/components/ConnectButton'

const queryClient = new QueryClient()

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NetworkBadge />
        <ConnectKitButton />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function NetworkBadge() {
  const chainId = useChainId()
  const { isConnected, address } = useAccount()
  const { switchChain } = useSwitchChain()
  
  const status = networkStatus(isConnected, chainId)
  const label = chainLabel(chainId)
  
  const statusColor = {
    'NOT_CONNECTED': 'bg-gray-500',
    'WRONG_NETWORK': 'bg-red-500', 
    'MAINNET': 'bg-blue-500',
    'TESTNET': 'bg-amber-500'
  }[status]
  
  const formatAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`
  
  return (
    <div className="fixed top-4 left-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium ${statusColor} shadow-lg`}>
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>{label}</span>
        {address && isConnected && (
          <span className="text-xs opacity-80">{formatAddress(address)}</span>
        )}
        {status === 'WRONG_NETWORK' && (
          <div className="flex gap-1">
            <button
              onClick={() => switchChain({ chainId: KAIA_MAINNET_ID })}
              className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-md text-xs"
            >
              Mainnet
            </button>
            <button
              onClick={() => switchChain({ chainId: KAIA_TESTNET_ID })}
              className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-md text-xs"
            >
              Testnet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}