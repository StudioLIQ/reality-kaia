'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState } from 'react'

export function ConnectKitButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showInstallHint, setShowInstallHint] = useState(false)
  
  const kaia = connectors[0] // First connector is injected (KaiaWallet)
  
  const onConnect = () => {
    if (!kaia) {
      setShowInstallHint(true)
      return
    }
    connect({ connector: kaia })
  }
  
  const formatAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`
  
  return (
    <div className="fixed top-4 right-4 z-50">
      {isConnected && address ? (
        <div className="flex items-center gap-2">
          <span className="text-white text-sm bg-gray-800 px-3 py-1.5 rounded-lg">
            {formatAddress(address)}
          </span>
          <button
            onClick={() => disconnect()}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={onConnect}
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Connecting...' : 'Connect KaiaWallet'}
          </button>
          {showInstallHint && (
            <div className="mt-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-400/30 rounded-lg px-3 py-2 max-w-xs">
              KaiaWallet extension not detected. Please install from the Chrome Web Store and refresh the page.
            </div>
          )}
        </div>
      )}
    </div>
  )
}