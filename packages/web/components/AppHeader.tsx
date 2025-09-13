"use client";
import Image from "next/image";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import WalletNetworkButton from '@/components/WalletNetworkButton';
import NavLink from '@/components/NavLink';
import FaucetButton from '@/components/FaucetButton';

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const lastLinkRef = useRef<HTMLAnchorElement | null>(null);
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus first item when menu opens
  useEffect(() => {
    if (open) firstLinkRef.current?.focus();
  }, [open]);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto max-w-6xl h-14 px-3 sm:px-4 flex items-center gap-3">
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

        {/* mobile menu button */}
        <button
          type="button"
          className="sm:hidden ml-1 inline-flex items-center justify-center rounded-md p-2 text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
          aria-label="Toggle navigation menu"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls="mobile-nav"
          onClick={() => setOpen(v => !v)}
        >
          {open ? (
            // Close icon
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Hamburger icon
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* menu */}
        <nav className="ml-3 sm:ml-4 hidden sm:flex items-center gap-1">
          <NavLink href="/dashboard" exact>Dashboard</NavLink>
          <NavLink href="/create" exact>Create Question</NavLink>
          <a
            href="https://github.com/StudioLIQ/reality-kaia"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-3 py-2 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors text-white/70 hover:text-white"
            aria-label="Open Docs in a new tab"
          >
            Docs
          </a>
        </nav>

        {/* right: faucet (testnet) + status button */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <FaucetButton />
          <WalletNetworkButton />
        </div>
      </div>

      {/* click-away overlay for mobile menu */}
      {open && (
        <button
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* mobile menu panel */}
      {open && (
        <div
          id="mobile-nav"
          role="menu"
          aria-label="Main navigation"
          ref={menuRef}
          className="sm:hidden border-t border-white/10 bg-neutral-950/95 backdrop-blur relative z-40"
          onKeyDown={(e) => {
            const keys = ['ArrowDown','ArrowUp','Home','End'];
            if (!keys.includes(e.key)) return;
            const container = menuRef.current;
            if (!container) return;
            const items = Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]'));
            if (items.length === 0) return;
            const current = document.activeElement as HTMLElement | null;
            let idx = Math.max(0, items.indexOf(current || items[0]));
            if (e.key === 'ArrowDown') idx = (idx + 1) % items.length;
            else if (e.key === 'ArrowUp') idx = (idx - 1 + items.length) % items.length;
            else if (e.key === 'Home') idx = 0;
            else if (e.key === 'End') idx = items.length - 1;
            e.preventDefault();
            items[idx]?.focus();
          }}
        >
          <div className="mx-auto max-w-6xl px-3 py-2 space-y-1">
            {/* focus trap sentinels */}
            <span
              tabIndex={0}
              className="sr-only"
              onFocus={() => lastLinkRef.current?.focus()}
            />
            <Link
              href="/dashboard"
              ref={firstLinkRef}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-3 py-2 rounded-lg hover:bg-white/5 text-sm font-medium text-white/90"
            >
              Dashboard
            </Link>
            <Link
              href="/create"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-3 py-2 rounded-lg hover:bg-white/5 text-sm font-medium text-white/90"
            >
              Create Question
            </Link>
            <a
              href="https://github.com/StudioLIQ/reality-kaia"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="block px-3 py-2 rounded-lg hover:bg-white/5 text-sm font-medium text-white/80"
              onClick={() => setOpen(false)}
              ref={lastLinkRef}
            >
              Docs
            </a>
            <span
              tabIndex={0}
              className="sr-only"
              onFocus={() => firstLinkRef.current?.focus()}
            />
          </div>
        </div>
      )}
    </header>
  );
}
