"use client";
import Image from "next/image";
import Link from 'next/link';
import WalletNetworkButton from '@/components/WalletNetworkButton';
import NavLink from '@/components/NavLink';
import FaucetButton from '@/components/FaucetButton';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto max-w-6xl h-14 px-4 flex items-center gap-3">
        {/* brand logo (explicit size) */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/orakore-logo.svg"
            alt="Orakore logo"
            width={28}
            height={28}
            priority
            className="hover:opacity-80 transition-opacity"
          />
          <span className="sr-only">Orakore</span>
        </Link>

        {/* menu */}
        <nav className="ml-4 flex items-center gap-1">
          <NavLink href="/dashboard" exact>Dashboard</NavLink>
          <NavLink href="/create" exact>Create Question</NavLink>
          <a
            href="https://github.com/StudioLIQ/reality-kaia"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors text-white/70 hover:text-white"
            aria-label="Open Docs in a new tab"
          >
            Docs
          </a>
        </nav>

        {/* right: faucet (testnet) + status button */}
        <div className="ml-auto flex items-center gap-2">
          <FaucetButton />
          <WalletNetworkButton />
        </div>
      </div>
    </header>
  );
}