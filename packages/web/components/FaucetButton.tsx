"use client";
import { useState, useEffect, useMemo } from "react";
import { useAccount, useWalletClient, useChainId, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { useAddresses } from "@/lib/contracts.client";

// MockUSDT faucet ABI
const FAUCET_ABI = [
  {
    inputs: [],
    name: "mintDaily",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "MINT_AMOUNT",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "lastMintTimestamp",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

export default function FaucetButton() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { addr, deployments } = useAddresses();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Use effect to handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get USDT address from deployments
  const tusdtAddress = useMemo(() => {
    if (!mounted || !deployments) return null;
    return deployments?.USDT || deployments?.MockUSDT;
  }, [deployments, mounted]);

  // Don't render anything on server or when not on testnet
  if (!mounted) return null;
  
  // Only show on testnet (Kairos - chain ID 1001)
  const shouldShow = chainId === 1001 && tusdtAddress && isConnected;

  if (!shouldShow) return null;

  const handleFaucet = async () => {
    if (!walletClient || !address || !publicClient) {
      setError("Wallet not connected");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    // Helper: detect user-cancelled tx across wallets/providers
    const isUserRejected = (e: any) => {
      const code = e?.code ?? e?.cause?.code;
      const name = e?.name || e?.cause?.name;
      const msg = (e?.shortMessage || e?.message || "").toLowerCase();
      return (
        code === 4001 || // EIP-1193 userRejectedRequest
        name === "UserRejectedRequestError" ||
        msg.includes("user rejected") ||
        msg.includes("rejected the request") ||
        msg.includes("user denied") ||
        msg.includes("denied transaction") ||
        msg.includes("request rejected") ||
        msg.includes("user canceled") ||
        msg.includes("user cancelled")
      );
    };

    try {
      // Check last mint timestamp (24 hour cooldown)
      const lastMintTimestamp = await publicClient.readContract({
        address: tusdtAddress as `0x${string}`,
        abi: FAUCET_ABI,
        functionName: "lastMintTimestamp",
        args: [address],
      });

      const now = Math.floor(Date.now() / 1000);
      const cooldownPeriod = 24 * 60 * 60; // 24 hours in seconds
      
      if (lastMintTimestamp && (now - Number(lastMintTimestamp)) < cooldownPeriod) {
        const remainingTime = cooldownPeriod - (now - Number(lastMintTimestamp));
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        throw new Error(`Please wait ${hours}h ${minutes}m before requesting again`);
      }

      // Call mintDaily function
      const hash = await walletClient.writeContract({
        address: tusdtAddress as `0x${string}`,
        abi: FAUCET_ABI,
        functionName: "mintDaily",
        args: [],
      });

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error("Faucet error:", err);
      // Silently ignore user-cancelled transactions
      if (isUserRejected(err)) {
        return;
      }

      // If mintDaily function fails, try direct mint function as fallback
      if (err.message?.includes("mintDaily") || err.message?.includes("once per day")) {
        try {
          const amount = parseUnits("10000", 6); // 10,000 tUSDT with 6 decimals (matching MINT_AMOUNT)
          const hash = await walletClient.writeContract({
            address: tusdtAddress as `0x${string}`,
            abi: FAUCET_ABI,
            functionName: "mint",
            args: [address, amount],
          });
          
          await publicClient.waitForTransactionReceipt({ hash });
          setSuccess(true);
          setTimeout(() => setSuccess(false), 5000);
          return;
        } catch (mintErr: any) {
          if (isUserRejected(mintErr)) {
            return;
          }
          setError(mintErr.message || "Failed to get test tokens");
        }
      } else {
        setError(err.message || "Failed to get test tokens");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleFaucet}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-400/10 px-3 py-1.5 text-sm text-blue-300 hover:bg-blue-400/20 transition-colors disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
            <span>Getting tUSDT...</span>
          </>
        ) : (
          <>
            <span>💧</span>
            <span>Faucet tUSDT</span>
          </>
        )}
      </button>
      
      {success && (
        <div className="absolute top-full mt-2 right-0 bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 px-3 py-2 rounded-lg text-xs whitespace-nowrap">
          ✓ Received 10,000 tUSDT
        </div>
      )}
      
      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-400/10 border border-red-400/30 text-red-300 px-3 py-2 rounded-lg text-xs max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}
