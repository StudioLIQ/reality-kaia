import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TokenSelector from "@/components/TokenSelector";
import { __setWagmiMock } from "@/test/mocks/wagmi";
import { WagmiTestWrapper } from "./helpers/WagmiTestWrapper";
import type { BondToken } from "@/lib/tokens";

const mockTokens: BondToken[] = [
  {
    label: "USDT",
    address: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    symbol: "USDT",
    decimals: 6,
    active: true,
  },
  {
    label: "WKAIA",
    address: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    symbol: "WKAIA",
    decimals: 18,
    active: true,
  },
  {
    label: "DAI",
    address: "0x3333333333333333333333333333333333333333" as `0x${string}`,
    symbol: "DAI",
    decimals: 18,
    active: false,
  },
];

// Mock wagmi's usePublicClient and useBalance
vi.mock("wagmi", async () => {
  const actual = await vi.importActual("wagmi");
  const mocks = await import("@/test/mocks/wagmi");
  
  return {
    ...actual,
    ...mocks,
    usePublicClient: () => ({
      readContract: vi.fn().mockImplementation(({ address }) => {
        // Mock different balances for different tokens
        if (address === mockTokens[0].address) return 1000000n; // 1 USDT (6 decimals)
        if (address === mockTokens[1].address) return 5000000000000000000n; // 5 WKAIA
        return 0n;
      }),
    }),
    useBalance: () => ({
      data: { value: 2000000000000000000n, decimals: 18, symbol: "KAIA" }, // 2 native KAIA
    }),
  };
});

// Helper function to render with wagmi wrapper
const renderWithWagmi = (ui: React.ReactElement) => render(<WagmiTestWrapper>{ui}</WagmiTestWrapper>);

describe("TokenSelector", () => {
  beforeEach(() => {
    __setWagmiMock({ isConnected: false, address: undefined });
  });

  it("renders all active tokens", () => {
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={mockTokens} onChange={onChange} />);
    
    expect(screen.getByText("USDT")).toBeInTheDocument();
    expect(screen.getByText("WKAIA")).toBeInTheDocument();
    // DAI is inactive, should not be shown
    expect(screen.queryByText("DAI")).not.toBeInTheDocument();
  });

  it("calls onChange when token is selected", () => {
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={mockTokens} value={mockTokens[0]} onChange={onChange} />);
    
    fireEvent.click(screen.getByText("WKAIA"));
    expect(onChange).toHaveBeenCalledWith(mockTokens[1]);
  });

  it("highlights selected token", () => {
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={mockTokens} value={mockTokens[0]} onChange={onChange} />);
    
    const usdtButton = screen.getByRole("button", { name: /USDT/i });
    expect(usdtButton.className).toContain("ring-2");
    expect(usdtButton.className).toContain("ring-emerald-400");
  });

  it("shows balance when wallet is connected", async () => {
    __setWagmiMock({ 
      isConnected: true, 
      address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
    });
    
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={mockTokens} onChange={onChange} />);
    
    await waitFor(() => {
      // USDT balance: 1 USDT
      expect(screen.getByText("1")).toBeInTheDocument();
      // WKAIA: 5 WKAIA + 2 native KAIA = 7
      expect(screen.getByText("7")).toBeInTheDocument();
    });
  });

  it("shows balance indicator icons", async () => {
    __setWagmiMock({ 
      isConnected: true, 
      address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
    });
    
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={mockTokens} onChange={onChange} />);
    
    await waitFor(() => {
      // Check for balance indicators (✓ for non-zero, ⚠ for zero)
      const buttons = screen.getAllByRole("button");
      expect(buttons[0].textContent).toContain("✓"); // USDT has balance
      expect(buttons[1].textContent).toContain("✓"); // WKAIA has balance
    });
  });

  it("disables inactive tokens", () => {
    const tokensWithInactive = [...mockTokens];
    tokensWithInactive[2].active = true; // Make DAI visible but still test disabled state
    
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={tokensWithInactive} onChange={onChange} />);
    
    const daiButton = screen.getByText("DAI").closest("button");
    expect(daiButton).toHaveAttribute("disabled");
  });

  it("shows loading state while fetching balances", async () => {
    __setWagmiMock({ 
      isConnected: true, 
      address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
    });
    
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={mockTokens} onChange={onChange} />);
    
    // Initially shows loading dots
    expect(screen.getAllByText("...")).toHaveLength(2); // One for each active token
    
    await waitFor(() => {
      // After loading, shows actual balances
      expect(screen.queryByText("...")).not.toBeInTheDocument();
    });
  });

  it("handles combined WKAIA + native KAIA balance", async () => {
    __setWagmiMock({ 
      isConnected: true, 
      address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
    });
    
    const onChange = vi.fn();
    renderWithWagmi(<TokenSelector tokens={mockTokens} onChange={onChange} />);
    
    await waitFor(() => {
      // WKAIA button should show combined balance
      const wkaiaButton = screen.getByRole("button", { name: /WKAIA/i });
      expect(wkaiaButton.textContent).toContain("7"); // 5 + 2
    });
  });
});