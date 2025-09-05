import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import AppHeader from "@/components/AppHeader";
import { __setWagmiMock, connectSpy, disconnectSpy, switchChainSpy } from "@/test/mocks/wagmi";
import { WagmiTestWrapper } from "./helpers/WagmiTestWrapper";

const renderWithWagmi = (ui: React.ReactElement) => render(<WagmiTestWrapper>{ui}</WagmiTestWrapper>);

describe("AppHeader", () => {
  beforeEach(() => {
    __setWagmiMock({ isConnected: false, address: undefined, chainId: 8217 });
  });

  it("renders navigation menu", () => {
    renderWithWagmi(<AppHeader />);
    
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create Question/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Docs/i })).toBeInTheDocument();
  });

  describe("WalletNetworkButton states", () => {
    it("shows 'Not Connected' when disconnected and connects on click", () => {
      renderWithWagmi(<AppHeader />);
      
      const button = screen.getByRole("button", { name: /Connect KaiaWallet/i });
      expect(button).toHaveTextContent("Not Connected");
      
      fireEvent.click(button);
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it("shows 'Mainnet · 0x...' when connected to mainnet", () => {
      __setWagmiMock({ 
        isConnected: true, 
        address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        chainId: 8217 
      });
      
      renderWithWagmi(<AppHeader />);
      
      const button = screen.getByRole("button");
      expect(button.textContent).toMatch(/Mainnet/i);
      expect(button.textContent).toMatch(/0x1234…7890/); // shortened address
    });

    it("shows 'Testnet · 0x...' when connected to testnet", () => {
      __setWagmiMock({ 
        isConnected: true, 
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
        chainId: 1001 
      });
      
      renderWithWagmi(<AppHeader />);
      
      const button = screen.getByRole("button");
      expect(button.textContent).toMatch(/Testnet/i);
      expect(button.textContent).toMatch(/0xaaaa…aaaa/);
    });

    it("shows 'Wrong Network' when connected to unsupported chain", () => {
      __setWagmiMock({ 
        isConnected: true, 
        address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
        chainId: 1 // Ethereum mainnet
      });
      
      renderWithWagmi(<AppHeader />);
      
      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Wrong Network");
    });

    it("disconnects wallet when connected and clicked", () => {
      __setWagmiMock({ 
        isConnected: true, 
        address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        chainId: 8217 
      });
      
      renderWithWagmi(<AppHeader />);
      
      const button = screen.getByRole("button", { name: /Disconnect wallet/i });
      fireEvent.click(button);
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it("shows wrong network button when on unsupported chain", () => {
      __setWagmiMock({ 
        isConnected: true, 
        address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
        chainId: 1 
      });
      
      renderWithWagmi(<AppHeader />);
      
      // When on wrong network, it shows warning icon and network name
      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Wrong Network");
      
      // Clicking the button should disconnect (not switch chain)
      fireEvent.click(button);
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("shows logo and branding", () => {
    renderWithWagmi(<AppHeader />);
    
    // Logo should link to homepage
    const logoLink = screen.getByRole("link", { name: /Orakore/i });
    expect(logoLink).toHaveAttribute("href", "/");
  });
});