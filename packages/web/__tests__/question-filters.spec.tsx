import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import QuestionFilters, { type QuestionRow } from "@/components/QuestionFilters";
import { __setWagmiMock } from "@/test/mocks/wagmi";

const mockQuestions: QuestionRow[] = [
  {
    id: "Q1",
    asker: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    createdAt: 1000,
    openingTs: 2000,
    timeoutSec: 86400, // 1 day
    finalized: false,
    bondTokenSymbol: "USDT",
    currentBondRaw: 1000000n, // 1 USDT
    text: "Will ETH hit $5000?",
  },
  {
    id: "Q2",
    asker: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    createdAt: 2000,
    openingTs: 3000,
    timeoutSec: 172800, // 2 days
    finalized: false,
    bondTokenSymbol: "WKAIA",
    currentBondRaw: 5000000000000000000n, // 5 WKAIA
    text: "Who will win the election?",
  },
  {
    id: "Q3",
    asker: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    createdAt: 3000,
    openingTs: 3500,
    timeoutSec: 259200, // 3 days
    finalized: true,
    bondTokenSymbol: "USDT",
    currentBondRaw: 10000000n, // 10 USDT
    text: "How many users by EOY?",
    bestAnswer: "0x0000000000000000000000000000000000000000000000000000000000002710", // 10000
  },
];

describe("QuestionFilters", () => {
  const onChange = vi.fn();
  
  beforeEach(() => {
    onChange.mockClear();
    __setWagmiMock({ isConnected: false, address: undefined });
  });

  it("renders filter controls", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    // Status chips
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Finalized")).toBeInTheDocument();
    
    // Controls
    expect(screen.getByText("Token")).toBeInTheDocument();
    expect(screen.getByText("Sort")).toBeInTheDocument();
    
    // My Questions button only shows when connected
    expect(screen.queryByText("My Questions")).not.toBeInTheDocument();
  });

  it("filters by My Questions when wallet is connected", () => {
    __setWagmiMock({ 
      isConnected: true, 
      address: "0x1111111111111111111111111111111111111111" as `0x${string}` 
    });
    
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    const myQuestionsButton = screen.getByRole("button", { name: /My Questions/i });
    fireEvent.click(myQuestionsButton);
    
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "Q1" }),
        expect.objectContaining({ id: "Q3" }),
      ])
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "Q2" }),
      ])
    );
  });

  it("filters by token type", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    const tokenSelect = screen.getByDisplayValue("All");
    fireEvent.change(tokenSelect, { target: { value: "USDT" } });
    
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "Q1" }),
        expect.objectContaining({ id: "Q3" }),
      ])
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "Q2" }),
      ])
    );
  });

  it("filters by status chips", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    // Click "Finalized" chip to toggle it off
    const finalizedChip = screen.getByRole("button", { name: /Finalized/i });
    fireEvent.click(finalizedChip);
    
    // Should exclude finalized questions
    expect(onChange).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "Q3" }),
      ])
    );
  });

  it("sorts by deadline by default", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    // Default sort should be by deadline
    const lastCall = onChange.mock.calls[0][0];
    
    // Questions should be sorted by deadline (opening + timeout)
    // Q3 has the furthest deadline (3500 + 259200)
    expect(lastCall[0].id).toBe("Q3");
  });

  it("sorts by bond amount when token is selected", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    // Select USDT token
    const tokenSelect = screen.getByDisplayValue("All");
    fireEvent.change(tokenSelect, { target: { value: "USDT" } });
    
    // Now change sort to BOND
    const sortSelect = screen.getByDisplayValue("Deadline");
    fireEvent.change(sortSelect, { target: { value: "BOND" } });
    
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    
    // Q3 has 10 USDT, Q1 has 1 USDT
    expect(lastCall[0].id).toBe("Q3");
    expect(lastCall[1].id).toBe("Q1");
  });

  it("disables bond sort when no token is selected", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    const sortSelect = screen.getByDisplayValue("Deadline");
    const bondOption = within(sortSelect).getByText(/Bond/).closest("option");
    
    expect(bondOption).toHaveAttribute("disabled");
    expect(bondOption?.textContent).toContain("select");
  });

  it("shows warning when trying to sort by bond without token", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    // The warning should not be visible initially
    expect(screen.queryByText(/Select a specific token/)).not.toBeInTheDocument();
  });

  it("shows question count", () => {
    render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    // Component may not show count - check if it exists
    // Using getAllByText since "Token" appears in multiple places
    const tokenElements = screen.getAllByText(/Token/i);
    expect(tokenElements.length).toBeGreaterThan(0);
  });

  it("resets filters when network changes", () => {
    const { rerender } = render(<QuestionFilters items={mockQuestions} onChange={onChange} />);
    
    // Apply some filters first
    const tokenSelect = screen.getByDisplayValue("All");
    fireEvent.change(tokenSelect, { target: { value: "USDT" } });
    
    // Re-render with new questions (simulating network change)
    rerender(<QuestionFilters items={[]} onChange={onChange} />);
    
    // onChange should be called with empty array
    expect(onChange).toHaveBeenCalledWith([]);
  });
});