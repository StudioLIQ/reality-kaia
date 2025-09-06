"use client";
import Link from "next/link";

export default function CreateError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-red-300">
        <h2 className="text-lg font-semibold mb-2">Create page failed to load</h2>
        <p className="text-sm opacity-90">{String(error?.message || "Unknown error")}</p>
        {error?.digest && <p className="mt-1 text-xs opacity-60">digest: {error.digest}</p>}
        <div className="mt-4 flex items-center gap-2">
          <button onClick={reset} className="px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs transition-colors">Try again</button>
          <Link href="/dashboard" className="px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs transition-colors">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}

