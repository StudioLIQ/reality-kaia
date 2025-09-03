"use client";
import type { BondToken } from "@/lib/tokens";

export default function TokenSelector({
  tokens, 
  value, 
  onChange
}: {
  tokens: BondToken[];
  value?: BondToken;
  onChange: (t: BondToken) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tokens.map(t => {
        const activeBadge = t.active
          ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
          : "bg-white/5 text-white/50 border border-white/10";
        const selected = value?.address === t.address;
        
        return (
          <button 
            key={t.address}
            type="button"
            onClick={() => onChange(t)}
            disabled={!t.active}
            className={`px-3 py-1.5 rounded-full border transition-all ${
              selected 
                ? "border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/20" 
                : t.active
                  ? "border-white/10 hover:border-white/20 hover:bg-white/5"
                  : "border-white/5 opacity-50 cursor-not-allowed"
            }`}
            aria-pressed={selected}
            aria-label={`Select ${t.label} token`}
          >
            <span className="font-medium">{t.label}</span>
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${activeBadge}`}>
              {t.active ? "Active" : "Inactive"}
            </span>
          </button>
        );
      })}
    </div>
  );
}