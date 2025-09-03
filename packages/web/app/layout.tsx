import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RealitioERC20 Dashboard',
  description: 'Oracle system for KAIA chain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <div className="flex items-center">
                    <h1 className="text-xl font-semibold">RealitioERC20</h1>
                    <div className="ml-10 flex items-baseline space-x-4">
                      <a href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                        Questions
                      </a>
                      <a href="/create" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                        Create Question
                      </a>
                    </div>
                  </div>
                  <ConnectButton 
                    label="Connect KaiaWallet"
                    showBalance={true}
                    chainStatus="icon"
                  />
                </div>
              </div>
            </nav>
            <main>{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  )
}