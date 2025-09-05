import React from "react";
import { vi } from "vitest";

// Mutable state for controlling wagmi hooks
let mockState = {
  isConnected: false,
  address: undefined as `0x${string}` | undefined,
  chainId: 8217,
  isLoading: false,
  isError: false,
};

// Helper to update mock state in tests
export function __setWagmiMock(nextState: Partial<typeof mockState>) {
  mockState = { ...mockState, ...nextState };
}

// Spy functions to assert interactions
export const connectSpy = vi.fn();
export const disconnectSpy = vi.fn();
export const switchChainSpy = vi.fn();

// Mock wagmi module
vi.mock("wagmi", async () => {
  const actual: any = await vi.importActual("wagmi");
  
  return {
    ...actual,
    
    // Account hooks
    useAccount: () => ({
      address: mockState.address,
      isConnected: mockState.isConnected,
      isConnecting: false,
      isDisconnected: !mockState.isConnected,
      connector: mockState.isConnected ? { id: "injected", name: "MetaMask" } : undefined,
    }),
    
    // Chain hooks
    useChainId: () => mockState.chainId,
    
    useChains: () => [
      { id: 8217, name: "Kaia Mainnet" },
      { id: 1001, name: "Kaia Testnet" },
    ],
    
    // Connection hooks
    useConnect: () => ({
      connect: connectSpy,
      connectors: [
        { id: "injected", name: "KaiaWallet", type: "injected" },
        { id: "metamask", name: "MetaMask", type: "injected" },
      ],
      isPending: false,
      isError: false,
      error: null,
    }),
    
    useDisconnect: () => ({
      disconnect: disconnectSpy,
      isPending: false,
      isError: false,
    }),
    
    useSwitchChain: () => ({
      switchChain: switchChainSpy,
      isPending: false,
      isError: false,
    }),
    
    // Tx hooks
    useWriteContract: () => ({
      writeContract: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
    }),
    
    // Misc
    useBalance: () => ({
      data: mockState.isConnected ? { value: 1000000000000000000n, decimals: 18, symbol: "KAIA" } : undefined,
      isLoading: mockState.isLoading,
      isError: mockState.isError,
    }),
  };
});

// Reset state before each test
export function resetWagmiMocks() {
  mockState = {
    isConnected: false,
    address: undefined,
    chainId: 8217,
    isLoading: false,
    isError: false,
  };
  connectSpy.mockClear();
  disconnectSpy.mockClear();
  switchChainSpy.mockClear();
}