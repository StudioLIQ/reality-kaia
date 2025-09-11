"use client";
import { useChainId } from "wagmi";
import { useEffect, useState } from "react";

export type DeploymentSchema = {
  realitioERC20?: `0x${string}`;
  RealitioERC20?: `0x${string}`;  // Support both naming conventions
  arbitratorSimple?: `0x${string}`;
  zapperWKAIA?: `0x${string}`;
  MockUSDT?: `0x${string}`;
  USDT?: `0x${string}`;
  WKAIA?: `0x${string}`;
  PERMIT2?: `0x${string}`;
  feeRecipient?: `0x${string}`;
  feeBps?: number;
  [k: string]: any;
};

// Try to load generated deployments if available
let getGenerated: ((chainId: number) => any) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("./deployments.generated");
  getGenerated = (mod && mod.getDeployments) ? mod.getDeployments : undefined;
} catch {}

async function loadRuntime(chainId: number): Promise<DeploymentSchema | null> {
  try {
    const res = await fetch(`/deployments/${chainId}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function loadDeployments(chainId: number) {
  if (getGenerated) {
    const d = getGenerated(chainId);
    if (d?.realitioERC20) return d as DeploymentSchema;
  }
  return await loadRuntime(chainId);
}

/**
 * Hook to load network-specific deployments
 * @param defaultChain - Chain ID to use when not connected (defaults to mainnet)
 */
export function useNetworkDeployments(defaultChain = 1001) {
  const chainId = useChainId() || defaultChain;
  const [data, setData] = useState<DeploymentSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadDeployments(chainId).then((d) => { if (alive) { setData(d); setLoading(false); }});
    return () => { alive = false; };
  }, [chainId]);

  const ready = !!(data?.realitioERC20 || data?.RealitioERC20);
  const error = !loading && !ready;
  return { chainId, deployments: data, ready, loading, error };
}
