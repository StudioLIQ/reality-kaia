"use client";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useBalance } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { ERC20_ABI } from "@/lib/contracts";
import type { BondToken } from "@/lib/tokens";

interface TokenStatusCardProps {
  token?: BondToken;
  requiredAmount: string; // Human-readable amount
  contractAddress?: `0x${string}`;
  onApprove?: () => void;
  approving?: boolean;
}

export default function TokenStatusCard({ 
  token, 
  requiredAmount, 
  contractAddress,
  onApprove,
  approving = false
}: TokenStatusCardProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  
  // Get native KAIA balance for WKAIA token
  const { data: nativeBalance } = useBalance({
    address: address
  });

  useEffect(() => {
    async function fetchTokenInfo() {
      if (!address || !isConnected || !publicClient || !token || !contractAddress) {
        setBalance(0n);
        setAllowance(0n);
        return;
      }

      setLoading(true);
      try {
        // For WKAIA, combine ERC20 + native balance
        if (token.label === 'WKAIA') {
          const wkaiaBalance = await publicClient.readContract({
            address: token.address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          });
          const nativeKaia = nativeBalance?.value || 0n;
          setBalance((wkaiaBalance as bigint) + nativeKaia);
        } else {
          // Regular ERC20 balance
          const balanceResult = await publicClient.readContract({
            address: token.address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          });
          setBalance(balanceResult as bigint);
        }

        // Fetch allowance
        const allowanceResult = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, contractAddress],
        });
        setAllowance(allowanceResult as bigint);
      } catch (err) {
        console.error('Error fetching token info:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTokenInfo();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTokenInfo, 5000);
    return () => clearInterval(interval);
  }, [address, isConnected, publicClient, token, contractAddress]);

  if (!token || !isConnected) return null;

  const requiredRaw = parseUnits(requiredAmount || '0', token.decimals);
  const balanceFormatted = formatUnits(balance, token.decimals);
  const allowanceFormatted = formatUnits(allowance, token.decimals);
  
  const hasEnoughBalance = balance >= requiredRaw;
  const hasEnoughAllowance = allowance >= requiredRaw;
  
  // Format numbers for display
  const displayBalance = parseFloat(balanceFormatted).toFixed(4).replace(/\.?0+$/, '');
  const displayAllowance = parseFloat(allowanceFormatted).toFixed(4).replace(/\.?0+$/, '');

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">Token Status</span>
        {loading && <span className="text-xs text-white/40">Refreshing...</span>}
      </div>

      {/* Balance Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">Balance:</span>
        <span className={`text-sm font-mono ${hasEnoughBalance ? 'text-emerald-400' : 'text-amber-400'}`}>
          {displayBalance} {token.symbol}
          {!hasEnoughBalance && (
            <span className="text-xs text-red-400 ml-2">
              (Need {requiredAmount})
            </span>
          )}
        </span>
      </div>

      {/* Allowance Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">Allowance:</span>
        <span className={`text-sm font-mono ${hasEnoughAllowance ? 'text-emerald-400' : 'text-amber-400'}`}>
          {displayAllowance} {token.symbol}
        </span>
      </div>

      {/* Approve Button - Not needed for WKAIA when using native KAIA via Zapper */}
      {!hasEnoughAllowance && hasEnoughBalance && token.label !== 'WKAIA' && (
        <button
          type="button"
          onClick={onApprove}
          disabled={approving || loading}
          className="w-full px-3 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {approving ? 'Approving...' : `Approve ${token.label}`}
        </button>
      )}
      
      {/* Info for WKAIA */}
      {token.label === 'WKAIA' && nativeBalance && nativeBalance.value > 0n && (
        <div className="text-xs text-blue-400 text-center">
          ℹ Will use native KAIA via Zapper (no approval needed)
        </div>
      )}

      {/* Status Messages */}
      {hasEnoughAllowance && hasEnoughBalance && (
        <div className="text-xs text-emerald-400 text-center">
          ✓ Ready to create question
        </div>
      )}
      
      {!hasEnoughBalance && (
        <div className="text-xs text-red-400 text-center">
          ⚠ Insufficient balance. Need {requiredAmount} {token.symbol}
        </div>
      )}
    </div>
  );
}