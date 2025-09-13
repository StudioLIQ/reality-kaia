"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href, children, exact = false,
}: { href: string; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path.startsWith(href);
  const base = "px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors";
  const on = active ? "bg-white/10 text-white" : "text-white/70 hover:text-white";
  return (
    <Link href={href} className={`${base} ${on}`}>
      {children}
    </Link>
  );
}
