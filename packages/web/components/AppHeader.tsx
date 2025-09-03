"use client";
import Link from 'next/link';
import WalletNetworkButton from '@/components/WalletNetworkButton';
import NavLink from '@/components/NavLink';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto max-w-6xl h-14 px-4 flex items-center gap-3">
        {/* brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center group-hover:bg-emerald-400/20 transition-colors">
            <span className="text-emerald-400 font-bold text-sm">O</span>
          </div>
          <span className="font-semibold text-white hidden sm:block">Orakore</span>
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

        {/* right: single status button only */}
        <div className="ml-auto">
          <WalletNetworkButton />
        </div>
      </div>
    </header>
  );
}