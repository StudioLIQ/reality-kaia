import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import { DisclaimerProvider } from '@/context/DisclaimerContext'
import AppHeader from '@/components/AppHeader'
import DisclaimerModal from '@/components/DisclaimerModal'

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
    <html lang="en" className="dark">
      <body className={inter.className}>
        <DisclaimerProvider>
          <WalletProvider>
            <div className="min-h-screen bg-neutral-950">
              <AppHeader />
              <main className="relative">
                {children}
              </main>
            </div>
            <DisclaimerModal />
          </WalletProvider>
        </DisclaimerProvider>
      </body>
    </html>
  )
}