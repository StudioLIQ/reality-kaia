"use client";
import { useEffect } from "react";
import { useChainId, useAccount, usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";

export default function NetworkWatcher() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();

  // Monitor chainId changes
  useEffect(() => {
    if (isConnected && chainId) {
      console.log('Chain ID updated:', chainId);
      // Refresh the page data when network changes
      router.refresh();
    }
  }, [chainId, isConnected, router]);

  // Also monitor publicClient changes (which happens on network switch)
  useEffect(() => {
    if (publicClient) {
      console.log('Network client updated');
    }
  }, [publicClient]);

  return null; // This is a utility component, doesn't render anything
}