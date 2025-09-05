"use client";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { ERC20_ABI } from "@/lib/contracts";
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
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  
  // Get native KAIA balance
  const { data: nativeBalance } = useBalance({
    address: address
  });

  // Fetch balances for all tokens
  useEffect(() => {
    async function fetchBalances() {
      if (!address || !isConnected || !publicClient || tokens.length === 0) {
        setBalances({});
        return;
      }

      setLoadingBalances(true);
      const newBalances: Record<string, string> = {};

      try {
        await Promise.all(
          tokens.map(async (token) => {
            try {
              // For WKAIA, combine ERC20 balance + native KAIA balance
              if (token.label === 'WKAIA') {
                const wkaiaBalance = await publicClient.readContract({
                  address: token.address,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [address],
                });
                
                const wkaiaFormatted = formatUnits(wkaiaBalance as bigint, token.decimals);
                const nativeFormatted = nativeBalance ? formatUnits(nativeBalance.value, 18) : '0';
                
                // Combine WKAIA + native KAIA
                const combined = parseFloat(wkaiaFormatted) + parseFloat(nativeFormatted);
                const displayBalance = combined.toFixed(4).replace(/\.?0+$/, '');
                newBalances[token.address] = displayBalance;
              } else {
                // Regular ERC20 token
                const balance = await publicClient.readContract({
                  address: token.address,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [address],
                });
                
                const formatted = formatUnits(balance as bigint, token.decimals);
                const displayBalance = parseFloat(formatted).toFixed(4).replace(/\.?0+$/, '');
                newBalances[token.address] = displayBalance;
              }
            } catch (err) {
              console.error(`Error fetching balance for ${token.label}:`, err);
              newBalances[token.address] = '0';
            }
          })
        );

        setBalances(newBalances);
      } catch (err) {
        console.error('Error fetching balances:', err);
      } finally {
        setLoadingBalances(false);
      }
    }

    fetchBalances();
  }, [address, isConnected, publicClient, tokens.length, nativeBalance?.value]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tokens.map(t => {
          const selected = value?.address === t.address;
          const balance = balances[t.address] || '0';
          const hasBalance = parseFloat(balance) > 0;
          
          return (
            <button 
              key={t.address}
              type="button"
              onClick={() => onChange(t)}
              disabled={!t.active}
              className={`relative px-4 py-2 rounded-lg border-2 transition-all min-w-[140px] ${
                selected 
                  ? "border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/20" 
                  : t.active
                    ? "border-white/20 hover:border-white/30 hover:bg-white/5"
                    : "border-white/10 opacity-50 cursor-not-allowed"
              }`}
              aria-pressed={selected}
              aria-label={`Select ${t.label} token`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{t.label}</span>
                  <span className="text-[10px] text-white/50">({t.decimals}d)</span>
                </div>
                
                {isConnected && (
                  <div className="text-xs text-white/60">
                    {loadingBalances ? (
                      <span className="opacity-50">...</span>
                    ) : (
                      <span className={hasBalance ? "text-emerald-400" : "text-amber-400"}>
                        {balance} {t.symbol}
                        {t.label === 'WKAIA' && nativeBalance && parseFloat(formatUnits(nativeBalance.value, 18)) > 0 && (
                          <span className="text-[10px] text-white/40 ml-1">
                            (incl. KAIA)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
                
                {!t.active && (
                  <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 px-1.5 py-0.5 text-[9px] bg-red-500/20 text-red-400 rounded">
                    Inactive
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {value && isConnected && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/50">Selected:</span>
          <span className="font-medium text-white">{value.label}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/50">Balance:</span>
          <span className={`font-mono ${parseFloat(balances[value.address] || '0') > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {balances[value.address] || '0'} {value.symbol}
          </span>
          {value.label === 'WKAIA' && (
            <span className="text-xs text-white/40">(WKAIA + Native KAIA)</span>
          )}
        </div>
      )}
    </div>
  );
}