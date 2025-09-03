"use client";
import { useState, useRef, useEffect } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { chainLabel, KAIA_MAINNET_ID, KAIA_TESTNET_ID, networkStatus } from "@/lib/chain";

const short = (a?: `0x${string}`) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";

export default function WalletNetworkButton() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const kaia = connectors.find(c => c.id === "injected" && c.name === "KaiaWallet") ?? 
                connectors.find(c => c.name === "KaiaWallet") ??
                connectors[0]; // Fallback to first connector
  
  const status = networkStatus(isConnected, chainId);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const onConnect = () => {
    if (!kaia) {
      window.alert("KaiaWallet not detected. Please install the extension and refresh.");
      return;
    }
    connect({ connector: kaia });
  };

  const switchTo = (id: number) => {
    if (switchChain) {
      switchChain({ chainId: id });
    }
    setOpen(false);
  };

  // Button styling
  const base = "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all";
  const pill = (cls: string) => `${base} ${cls}`;
  const dot = (cls: string) => <span className={`h-2 w-2 rounded-full ${cls}`} />;

  const ButtonView = () => {
    if (status === "NOT_CONNECTED") {
      return (
        <button 
          onClick={onConnect} 
          disabled={isConnPending}
          className={pill("border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300")}
        >
          {dot("bg-emerald-400")} 
          {isConnPending ? "Connecting..." : "Connect KaiaWallet"}
        </button>
      );
    }
    
    if (status === "WRONG_NETWORK") {
      return (
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setOpen(v => !v)} 
            className={pill("border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300")}
          >
            {dot("bg-amber-400")} Wrong Network
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-black/95 backdrop-blur-sm p-2 z-50 shadow-xl">
              <button 
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors"
                onClick={() => switchTo(KAIA_MAINNET_ID)} 
                disabled={isSwitching}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Switch to Kaia Mainnet (8217)
                </div>
              </button>
              <button 
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors"
                onClick={() => switchTo(KAIA_TESTNET_ID)} 
                disabled={isSwitching}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Switch to Kairos Testnet (1001)
                </div>
              </button>
              <div className="mt-2 border-t border-white/10" />
              <button 
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-red-400 transition-colors"
                onClick={() => { setOpen(false); disconnect(); }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      );
    }
    
    // Connected on allowed network
    const color = status === "MAINNET" ? "bg-sky-400" : "bg-emerald-400";
    const badge = status === "MAINNET" ? "Mainnet" : "Testnet";
    
    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setOpen(v => !v)} 
          className={pill("border-white/10 hover:bg-white/5 text-white")}
        >
          {dot(color)} Kaia {badge} · {short(address)}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-black/95 backdrop-blur-sm p-2 z-50 shadow-xl">
            <div className="px-3 py-2 text-xs opacity-70">Connected: {chainLabel(chainId)}</div>
            <button 
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors disabled:opacity-50"
              onClick={() => switchTo(KAIA_MAINNET_ID)} 
              disabled={isSwitching || chainId === KAIA_MAINNET_ID}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Switch to Kaia Mainnet (8217)
                {chainId === KAIA_MAINNET_ID && <span className="ml-auto text-xs opacity-50">Current</span>}
              </div>
            </button>
            <button 
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors disabled:opacity-50"
              onClick={() => switchTo(KAIA_TESTNET_ID)} 
              disabled={isSwitching || chainId === KAIA_TESTNET_ID}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Switch to Kairos Testnet (1001)
                {chainId === KAIA_TESTNET_ID && <span className="ml-auto text-xs opacity-50">Current</span>}
              </div>
            </button>
            <div className="mt-2 border-t border-white/10" />
            <button 
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-red-400 transition-colors"
              onClick={() => { setOpen(false); disconnect(); }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  };

  return <ButtonView />;
}