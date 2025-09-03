import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import { DisclaimerProvider } from '@/context/DisclaimerContext'
import AppHeader from '@/components/AppHeader'
import HeaderDisclaimerBar from '@/components/HeaderDisclaimerBar'
import DisclaimerModal from '@/components/DisclaimerModal'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: "Orakore",
    template: "%s · Orakore",
  },
  description:
    "Orakore — a personal, unaudited Reality.eth-driven oracle on Kaia. Provided AS IS. Use at your own risk.",
  applicationName: "Orakore",
  keywords: ["Orakore", "Kaia", "Reality.eth", "oracle", "prediction", "dapp"],
  openGraph: {
    title: "Orakore",
    description:
      "Orakore — a personal, unaudited Reality.eth-driven oracle on Kaia. Provided AS IS.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orakore",
    description:
      "Orakore — a personal, unaudited Reality.eth-driven oracle on Kaia.",
  },
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
              <HeaderDisclaimerBar />
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