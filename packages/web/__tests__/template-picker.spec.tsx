import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TemplatePicker from "@/components/TemplatePicker";
import type { TemplateSpec } from "@/lib/templates";

const mockTemplates: TemplateSpec[] = [
  {
    id: 1,
    label: "Binary",
    summary: "Yes/No questions with two outcomes",
    details: ["Clear yes/no answers", "Perfect for predictions"],
    sample: "Will ETH exceed $5000 by Dec 31?",
    answerType: "binary",
    badges: ["Popular"],
  },
  {
    id: 3,
    label: "Multiple Choice",
    summary: "Select from multiple options",
    details: ["2-10 choices", "One correct answer"],
    sample: "Who will win the election? A/B/C",
    answerType: "multi",
  },
  {
    id: 4,
    label: "Integer",
    summary: "Numeric answers",
    details: ["Whole numbers only", "Can be negative"],
    sample: "How many transactions?",
    answerType: "integer",
  },
];

describe("TemplatePicker", () => {
  it("renders all template options", () => {
    const onChange = vi.fn();
    render(<TemplatePicker items={mockTemplates} onChange={onChange} />);
    
    expect(screen.getByText("Binary")).toBeInTheDocument();
    expect(screen.getByText("Multiple Choice")).toBeInTheDocument();
    expect(screen.getByText("Integer")).toBeInTheDocument();
    
    // Check summaries
    expect(screen.getByText(/Yes\/No questions/)).toBeInTheDocument();
    expect(screen.getByText(/Select from multiple options/)).toBeInTheDocument();
  });

  it("calls onChange when template is selected", () => {
    const onChange = vi.fn();
    render(<TemplatePicker items={mockTemplates} onChange={onChange} />);
    
    fireEvent.click(screen.getByText("Binary"));
    expect(onChange).toHaveBeenCalledWith(1);
    
    fireEvent.click(screen.getByText("Multiple Choice"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("highlights selected template", () => {
    const onChange = vi.fn();
    render(<TemplatePicker items={mockTemplates} value={1} onChange={onChange} />);
    
    const binaryButton = screen.getByRole("button", { name: /Select template 1: Binary/ });
    expect(binaryButton).toHaveAttribute("aria-pressed", "true");
    expect(binaryButton.className).toContain("border-emerald-400");
  });

  it("shows info panel when template is selected", () => {
    const onChange = vi.fn();
    render(<TemplatePicker items={mockTemplates} value={1} onChange={onChange} />);
    
    expect(screen.getByText("Selected: Template #1")).toBeInTheDocument();
    // Binary text appears multiple times, use getAllByText
    const binaryTexts = screen.getAllByText("Binary");
    expect(binaryTexts.length).toBeGreaterThan(1); // At least in button and info panel
    expect(screen.getByText(/Clear yes\/no answers/)).toBeInTheDocument();
    expect(screen.getByText("Will ETH exceed $5000 by Dec 31?")).toBeInTheDocument();
  });

  it("shows badges when available", () => {
    const onChange = vi.fn();
    render(<TemplatePicker items={mockTemplates} onChange={onChange} />);
    
    expect(screen.getByText("Popular")).toBeInTheDocument();
  });

  it("updates selection when value prop changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(<TemplatePicker items={mockTemplates} value={1} onChange={onChange} />);
    
    expect(screen.getByRole("button", { name: /Select template 1: Binary/ }))
      .toHaveAttribute("aria-pressed", "true");
    
    rerender(<TemplatePicker items={mockTemplates} value={3} onChange={onChange} />);
    
    expect(screen.getByRole("button", { name: /Select template 3: Multiple Choice/ }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Select template 1: Binary/ }))
      .toHaveAttribute("aria-pressed", "false");
  });
});