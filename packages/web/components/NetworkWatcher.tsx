"use client";
import { useEffect, useState } from "react";
import { useChainId, useAccount, usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";

export default function NetworkWatcher() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [prevChainId, setPrevChainId] = useState<number>();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Monitor chainId changes (only on client)
  useEffect(() => {
    if (!mounted) return;
    
    if (isConnected && chainId && prevChainId && chainId !== prevChainId) {
      // Chain changed from prevChainId to chainId
      // Refresh the page data when network changes
      router.refresh();
    }
    
    if (chainId) {
      setPrevChainId(chainId);
    }
  }, [chainId, isConnected, router, mounted, prevChainId]);

  // Also monitor publicClient changes (which happens on network switch)
  useEffect(() => {
    if (!mounted) return;
    
    if (publicClient) {
      // Network client updated
    }
  }, [publicClient, mounted]);

  return null; // This is a utility component, doesn't render anything
}