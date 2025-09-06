"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Flash = { message: string; href?: string; label?: string } | null;

const STORAGE_KEY = "oo:flash";

export default function FlashBanner() {
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const f = JSON.parse(raw) as Flash;
        setFlash(f);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  if (!flash) return null;

  return (
    <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <span>{flash.message}</span>
        {flash.href && (
          <Link
            href={flash.href}
            className="underline underline-offset-2 hover:text-emerald-200"
          >
            {flash.label || "View"}
          </Link>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setFlash(null)}
        className="ml-3 inline-flex items-center justify-center rounded-md px-2 py-1 text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-400/10"
      >
        Dismiss
      </button>
    </div>
  );
}

