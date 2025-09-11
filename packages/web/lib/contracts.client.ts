// packages/web/lib/contracts.client.ts
"use client";
import { useNetworkDeployments } from "./addresses";

export function useAddresses() {
  const { chainId, deployments, ready, loading, error } = useNetworkDeployments(1001);
  return {
    chainId,
    deployments,
    addr: {
      reality: (deployments?.RealitioERC20 || deployments?.realitioERC20) as `0x${string}` | undefined,
      arbitrator: deployments?.arbitratorSimple as `0x${string}` | undefined,
      zapper: deployments?.zapperWKAIA as `0x${string}` | undefined,
      usdt:    deployments?.USDT || deployments?.MockUSDT as `0x${string}` | undefined,
      wkaia:   deployments?.WKAIA as `0x${string}` | undefined,
      permit2: deployments?.PERMIT2 as `0x${string}` | undefined,
      feeRecipient: deployments?.feeRecipient as `0x${string}` | undefined,
    },
    feeBps: deployments?.feeBps,
    ready, loading, error,
  };
}
