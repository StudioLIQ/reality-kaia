"use client";
import { useDisclaimer } from "@/context/DisclaimerContext";

export default function DisclaimerBadge({ compact = false }: { compact?: boolean }) {
  const { open } = useDisclaimer();
  
  return (
    <button 
      onClick={open}
      className="group inline-flex items-center gap-1.5 rounded-full border border-amber-400/30
                 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-400/20
                 transition-colors"
      aria-label="Open disclaimer"
    >
      <span className="text-sm">⚠︎</span>
      {compact ? (
        <span>Not audited · Personal project · Use at own risk</span>
      ) : (
        <span>Not audited · Personal project · Provided AS IS · Use at your own risk. Click to read.</span>
      )}
    </button>
  );
}