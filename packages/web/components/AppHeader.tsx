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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto max-w-6xl h-14 px-4 flex items-center gap-3">
        {/* left: brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center group-hover:bg-emerald-400/20 transition-colors">
            <span className="text-emerald-400 font-bold text-sm">O</span>
          </div>
          <span className="font-semibold text-white hidden sm:block">Orakore</span>
        </Link>

        {/* center: tabs — Dashboard only */}
        <nav className="ml-4">
          <NavLink href="/">Dashboard</NavLink>
        </nav>

        {/* right: Create CTA + single status button */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/create"
            aria-label="Create Question"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-400/20 transition-colors"
          >
            <span className="text-base">+</span> Create Question
          </Link>
          <WalletNetworkButton />
        </div>
      </div>
    </header>
  );
}