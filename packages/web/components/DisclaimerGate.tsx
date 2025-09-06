"use client";
import { ReactNode } from "react";
import { useDisclaimer } from "@/context/DisclaimerContext";
import DisclaimerBadge from "./DisclaimerBadge";

export default function DisclaimerGate({ children }: { children: ReactNode }) {
  const { acknowledged, open } = useDisclaimer();
  
  if (acknowledged) return <>{children}</>;
  
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-300 text-sm">
        <p className="font-medium mb-1">⚠️ Disclaimer Required</p>
        <p className="text-xs opacity-90">
          Please read and acknowledge the disclaimer before proceeding with this action.
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <DisclaimerBadge />
        <button 
          type="button"
          onClick={open}
          className="px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs transition-colors"
          aria-label="Open disclaimer dialog"
        >
          Open disclaimer
        </button>
      </div>
      
      {/* Actions are visually disabled until acknowledged */}
      <div className="pointer-events-none opacity-50 select-none" aria-disabled="true">
        {children}
      </div>
    </div>
  );
}