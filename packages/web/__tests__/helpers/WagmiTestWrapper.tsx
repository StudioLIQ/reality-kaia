import React, { ReactNode } from "react";
import { WagmiConfig, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPublicClient } from "viem";

const fakeChain = {
  id: 8217,
  name: "Kaia Mainnet",
  nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } }
} as any;

const config = createConfig({
  chains: [fakeChain],
  transports: { [fakeChain.id]: http("http://127.0.0.1:8545") }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function WagmiTestWrapper({ children }: { children: ReactNode }) {
  // We don't actually connect; components should tolerate not-connected state.
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>{children}</WagmiConfig>
    </QueryClientProvider>
  );
}