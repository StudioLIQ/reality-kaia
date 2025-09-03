"use client";
import { KAIA_MAINNET_ID, KAIA_TESTNET_ID } from "@/lib/chain";

export default function NetworkChips({
  value, 
  onChange
}: { 
  value: number | "all"; 
  onChange: (v: number | "all") => void;
}) {
  const Item = ({ 
    label, 
    active, 
    onClick 
  }: { 
    label: string; 
    active: boolean; 
    onClick: () => void;
  }) => (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border transition-all text-sm font-medium ${
        active 
          ? "border-emerald-400 bg-emerald-400/10 text-emerald-300 shadow-lg shadow-emerald-400/20" 
          : "border-white/10 hover:border-white/20 text-white/70 hover:text-white"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
  
  return (
    <div className="flex flex-wrap gap-2">
      <Item 
        label="All" 
        active={value === "all"} 
        onClick={() => onChange("all")} 
      />
      <Item 
        label="Kaia Mainnet" 
        active={value === KAIA_MAINNET_ID} 
        onClick={() => onChange(KAIA_MAINNET_ID)} 
      />
      <Item 
        label="Kaia Kairos" 
        active={value === KAIA_TESTNET_ID} 
        onClick={() => onChange(KAIA_TESTNET_ID)} 
      />
    </div>
  );
}