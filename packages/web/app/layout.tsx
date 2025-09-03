import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import { DisclaimerProvider } from '@/context/DisclaimerContext'
import AppHeader from '@/components/AppHeader'
import HeaderDisclaimerBar from '@/components/HeaderDisclaimerBar'
import DisclaimerModal from '@/components/DisclaimerModal'
import NetworkWatcher from '@/components/NetworkWatcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: "Orakore - Optimistic oracle for KAIA network",
    template: "%s · Orakore",
  },
  description:
    "Orakore — a Optimistic oracle for KAIA network. Personal, unaudited. Provided AS IS. Use at your own risk.",
  applicationName: "Orakore",
  keywords: ["Orakore", "Kaia", "Reality.eth", "oracle", "prediction", "dapp"],
  openGraph: {
    title: "Orakore - Optimistic oracle for KAIA network",
    description:
      "Orakore — a Optimistic oracle for KAIA network. Personal, unaudited. Provided AS IS. Use at your own risk.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orakore - Optimistic oracle for KAIA network",
    description:
      "Orakore — a Optimistic oracle for KAIA network. Personal, unaudited. Provided AS IS. Use at your own risk.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any", rel: "icon" },
    ],
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
            <NetworkWatcher />
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