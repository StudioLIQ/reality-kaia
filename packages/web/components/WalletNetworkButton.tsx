"use client";
import { useMemo, useState, useEffect } from "react";
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";
import { KAIA_MAINNET_ID, KAIA_TESTNET_ID } from "@/lib/chain";

export type NetStatus = "NOT_CONNECTED" | "WRONG_NETWORK" | "MAINNET" | "TESTNET";

const statusOf = (connected: boolean, id?: number): NetStatus => {
  if (!connected) return "NOT_CONNECTED";
  if (id === KAIA_TESTNET_ID) return "TESTNET";
  // Temporarily treat mainnet and others as wrong network
  return "WRONG_NETWORK";
};

// Icon components
const Dot = ({ cls }: { cls: string }) => (
  <span className={`inline-block h-2 w-2 rounded-full ${cls}`} aria-hidden="true" />
);

const Plug = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-90">
    <path fill="currentColor" d="M7 7h10v3a5 5 0 0 1-5 5H7V7Zm2-5h6v4H9V2Zm-5 6h4v10H6a2 2 0 0 1-2-2V8Z" />
  </svg>
);

const Alert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-90">
    <path fill="currentColor" d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
  </svg>
);

export default function WalletNetworkButton() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  
  // Use a mounted state to prevent hydration mismatches
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to disconnected state during SSR to prevent hydration issues
  const status = mounted ? statusOf(isConnected, chainId) : "NOT_CONNECTED";
  
  const kaia = useMemo(() => {
    return connectors.find(c => c.id === "injected" && c.name === "KaiaWallet") ?? 
           connectors.find(c => c.name === "KaiaWallet") ?? 
           connectors.find(c => c.type === "injected");
  }, [connectors]);

  const onClick = () => {
    if (status === "NOT_CONNECTED") {
      if (!kaia) return alert("KaiaWallet not detected. Please install the extension and refresh.");
      connect({ connector: kaia });
    } else {
      disconnect();
    }
  };

  const label =
    status === "NOT_CONNECTED" ? "Not Connected" :
    status === "WRONG_NETWORK" ? "Wrong Network" :
    status === "MAINNET" ? "Mainnet" : "Testnet";

  const icon =
    status === "NOT_CONNECTED" ? <Plug /> :
    status === "WRONG_NETWORK" ? <Alert /> :
    status === "MAINNET" ? <Dot cls="bg-sky-400" /> : <Dot cls="bg-emerald-400" />;

  const suffix = mounted && isConnected ? ` · ${shortAddress(address)}` : "";
  const busy = isConnecting || isDisconnecting;

  const base = "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40";
  const theme =
    status === "NOT_CONNECTED" ? "border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20" :
    status === "WRONG_NETWORK" ? "border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20" :
    "border-white/10 hover:bg-white/5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={status === "NOT_CONNECTED" ? "Connect KaiaWallet" : "Disconnect wallet"}
      className={`${base} ${theme} ${busy ? "opacity-60" : ""}`}
    >
      <span className="text-xs opacity-80">{icon}</span>
      <span>{label}{suffix}</span>
    </button>
  );
}
