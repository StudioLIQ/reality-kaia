import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HeaderDisclaimerBar from "@/components/HeaderDisclaimerBar";
import DisclaimerModal from "@/components/DisclaimerModal";
import { DisclaimerProvider } from "@/context/DisclaimerContext";

// Wrapper component that includes both the bar and modal
function DisclaimerTestShell() {
  return (
    <DisclaimerProvider>
      <HeaderDisclaimerBar />
      <DisclaimerModal />
    </DisclaimerProvider>
  );
}

describe("Disclaimer Components", () => {
  it("shows disclaimer bar with warning icon and text", () => {
    render(<DisclaimerTestShell />);
    
    expect(screen.getByText(/Please review the disclaimer/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open disclaimer/i })).toBeInTheDocument();
  });

  it("opens modal when badge is clicked", async () => {
    render(<DisclaimerTestShell />);
    
    // Initially no dialog
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    
    // Click the badge
    const badge = screen.getByRole("button", { name: /Open disclaimer/i });
    fireEvent.click(badge);
    
    // Modal should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    
    // Check modal content
    expect(screen.getByText(/⚠️ Disclaimer/i)).toBeInTheDocument();
    expect(screen.getByText(/This software and the associated smart contracts/i)).toBeInTheDocument();
  });

  it("renders disclaimer text in the bar", () => {
    render(<DisclaimerTestShell />);
    
    // Check that the disclaimer text is visible
    expect(screen.getByText(/Please review the disclaimer/i)).toBeInTheDocument();
    
    // The text itself is not clickable, only the badge
    const disclaimerText = screen.getByText(/Please review the disclaimer/i);
    expect(disclaimerText.closest('button')).toBeNull();
  });

  it("closes modal when Continue button is clicked", async () => {
    render(<DisclaimerTestShell />);
    
    // Open modal
    const badge = screen.getByRole("button", { name: /Open disclaimer/i });
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    
    // Click acknowledge button
    const acknowledgeButton = screen.getByRole("button", { name: /Acknowledge and don't show again/i });
    fireEvent.click(acknowledgeButton);
    
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows multiple warning points in modal", async () => {
    render(<DisclaimerTestShell />);
    
    // Open modal
    const badge = screen.getByRole("button", { name: /Open disclaimer/i });
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    
    // Check for warning content
    expect(screen.getByText(/assumes no liability/i)).toBeInTheDocument();
    expect(screen.getByText(/have not undergone any third-party security audit/i)).toBeInTheDocument();
    expect(screen.getByText(/loss of digital assets/i)).toBeInTheDocument();
  });

  it("shows acknowledge button with dynamic text", async () => {
    render(<DisclaimerTestShell />);
    
    // Open modal
    const badge = screen.getByRole("button", { name: /Open disclaimer/i });
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    
    // Find acknowledge button - it should exist with some form of "acknowledge" aria-label
    const acknowledgeButton = screen.getByRole("button", { name: /Acknowledge/i });
    expect(acknowledgeButton).toBeInTheDocument();
    
    // The text content changes based on whether it's been acknowledged before
    const buttonText = acknowledgeButton.textContent;
    expect(buttonText).toMatch(/I understand/i);
    
    // Click it to close the modal
    fireEvent.click(acknowledgeButton);
    
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});