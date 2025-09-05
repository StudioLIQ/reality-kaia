// packages/web/lib/addresses.ts
"use client";
import { useChainId } from "wagmi";
import { useEffect, useState } from "react";

export type DeploymentSchema = {
  realitioERC20?: `0x${string}`;
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

// (옵션) script가 생성한 TS 헬퍼가 있으면 우선 사용
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

/** 연결 안된 경우 기본 체인을 8217(Mainnet)로 사용 (원하면 1001로 바꿔도 됨) */
export function useNetworkDeployments(defaultChain = 8217) {
  const chainId = useChainId() || defaultChain;
  const [data, setData] = useState<DeploymentSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadDeployments(chainId).then((d) => { if (alive) { setData(d); setLoading(false); }});
    return () => { alive = false; };
  }, [chainId]);

  const ready = !!data?.realitioERC20;
  const error = !loading && !ready;
  return { chainId, deployments: data, ready, loading, error };
}