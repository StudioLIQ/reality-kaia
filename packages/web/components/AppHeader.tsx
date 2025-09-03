"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletNetworkButton from '@/components/WalletNetworkButton';

export default function AppHeader() {
  const pathname = usePathname();
  
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link 
        href={href}
        className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
          isActive 
            ? 'bg-white/10 text-white' 
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        {children}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl h-14 px-4 flex items-center">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center group-hover:bg-emerald-400/20 transition-colors">
            <span className="text-emerald-400 font-bold text-sm">O</span>
          </div>
          <span className="font-semibold text-white hidden sm:block">Oracle</span>
        </Link>

        {/* Center Tabs */}
        <nav className="ml-8 flex items-center gap-1">
          <NavLink href="/">Account</NavLink>
          <NavLink href="/feed">Data Feed</NavLink>
          <NavLink href="/proof">Proof of Reserve</NavLink>
          <NavLink href="/create">Create</NavLink>
        </nav>

        {/* Right side - Wallet */}
        <div className="ml-auto">
          <WalletNetworkButton />
        </div>
      </div>
    </header>
  );
}