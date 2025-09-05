import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAddresses } from "@/lib/contracts.client";

// Mock dependencies
vi.mock("@/lib/contracts.client", () => ({
  useAddresses: vi.fn()
}));

vi.mock("wagmi", async () => {
  const actual = await vi.importActual("wagmi");
  const mocks = await import("@/test/mocks/wagmi");
  
  return {
    ...actual,
    ...mocks,
    useWalletClient: () => ({ data: null }),
    usePublicClient: () => ({}),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Simple guard component to test the pattern
function CreatePageGuard() {
  const { addresses, loading } = useAddresses() as any;
  
  if (loading) {
    return <div>Loading deployment info...</div>;
  }
  
  if (!addresses?.RealitioERC20) {
    return (
      <div className="error-container">
        <h2>Deployment Error</h2>
        <p>Cannot load contract addresses for this network</p>
      </div>
    );
  }
  
  return (
    <div className="create-form">
      <h1>Create New Question</h1>
      <p>Contract loaded: {addresses.RealitioERC20}</p>
    </div>
  );
}

describe("Create Page Guard Pattern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state while fetching deployments", () => {
    (useAddresses as any).mockReturnValue({
      addresses: null,
      loading: true,
    });
    
    render(<CreatePageGuard />);
    
    expect(screen.getByText("Loading deployment info...")).toBeInTheDocument();
  });

  it("shows error when deployments are missing", () => {
    (useAddresses as any).mockReturnValue({
      addresses: null,
      loading: false,
    });
    
    render(<CreatePageGuard />);
    
    expect(screen.getByText("Deployment Error")).toBeInTheDocument();
    expect(screen.getByText(/Cannot load contract addresses/i)).toBeInTheDocument();
    expect(screen.queryByText("Create New Question")).not.toBeInTheDocument();
  });

  it("shows form when deployments are loaded", () => {
    (useAddresses as any).mockReturnValue({
      addresses: {
        RealitioERC20: "0x1111111111111111111111111111111111111111",
        USDT: "0x2222222222222222222222222222222222222222",
        WKAIA: "0x3333333333333333333333333333333333333333",
        PERMIT2: "0x4444444444444444444444444444444444444444",
        ZapperWKAIA: "0x5555555555555555555555555555555555555555",
        feeRecipient: "0x7abEdc832254DaA2032505e33A8Dd325841D6f2D",
        feeBps: 25,
      },
      loading: false,
    });
    
    render(<CreatePageGuard />);
    
    expect(screen.getByText("Create New Question")).toBeInTheDocument();
    expect(screen.getByText(/Contract loaded: 0x1111/)).toBeInTheDocument();
    expect(screen.queryByText("Deployment Error")).not.toBeInTheDocument();
  });

  it("handles partial deployments gracefully", () => {
    (useAddresses as any).mockReturnValue({
      addresses: {
        USDT: "0x2222222222222222222222222222222222222222",
        // Missing RealitioERC20
      },
      loading: false,
    });
    
    render(<CreatePageGuard />);
    
    expect(screen.getByText("Deployment Error")).toBeInTheDocument();
  });

  it("re-renders when network changes", () => {
    const mockUseAddresses = useAddresses as any;
    
    // Start with mainnet deployments
    mockUseAddresses.mockReturnValue({
      addresses: {
        RealitioERC20: "0x1111111111111111111111111111111111111111",
      },
      loading: false,
    });
    
    const { rerender } = render(<CreatePageGuard />);
    expect(screen.getByText("Create New Question")).toBeInTheDocument();
    
    // Switch to loading state
    mockUseAddresses.mockReturnValue({
      addresses: null,
      loading: true,
    });
    
    rerender(<CreatePageGuard />);
    expect(screen.getByText("Loading deployment info...")).toBeInTheDocument();
    
    // Then to error state
    mockUseAddresses.mockReturnValue({
      addresses: null,
      loading: false,
    });
    
    rerender(<CreatePageGuard />);
    expect(screen.getByText("Deployment Error")).toBeInTheDocument();
  });
});