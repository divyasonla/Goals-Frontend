import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReflectionAnalyzer from "@/components/ReflectionAnalyzer";
import { analyzeReflection } from "@/lib/api";

vi.mock("@/lib/api", () => ({ analyzeReflection: vi.fn() }));

const analysis = {
  score: 78,
  strengths: ["You named what you completed."],
  challenges: ["One task took extra time."],
  suggestions: ["Add a specific example."],
  nextAction: "Try one more practice task tomorrow.",
  summary: "Your reflection describes progress and a next step.",
};

describe("ReflectionAnalyzer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("analyzes the entered fields and displays feedback without editing the input values", async () => {
    vi.mocked(analyzeReflection).mockResolvedValue({ success: true, analysis });
    const input = { reflection: "I completed a lesson.", wentWell: "I stayed focused.", challenges: "One exercise was hard.", left: "Review it tomorrow." };
    render(<ReflectionAnalyzer {...input} />);

    fireEvent.click(screen.getByRole("button", { name: "Analyze Reflection" }));
    expect(await screen.findByText(analysis.summary)).toBeInTheDocument();
    expect(analyzeReflection).toHaveBeenCalledWith(input);
    expect(input.reflection).toBe("I completed a lesson.");
    expect(screen.getByText(analysis.nextAction)).toBeInTheDocument();
  });

  it("shows a loading state while the analysis is pending", async () => {
    let resolveRequest!: (value: { success: true; analysis: typeof analysis }) => void;
    vi.mocked(analyzeReflection).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<ReflectionAnalyzer reflection="A reflection." wentWell="" challenges="" left="" />);
    fireEvent.click(screen.getByRole("button", { name: "Analyze Reflection" }));
    expect(screen.getByRole("button", { name: "Analyzing your reflection..." })).toBeDisabled();
    resolveRequest({ success: true, analysis });
    await screen.findByText(analysis.summary);
  });

  it("allows the student to dismiss feedback", async () => {
    vi.mocked(analyzeReflection).mockResolvedValue({ success: true, analysis });
    render(<ReflectionAnalyzer reflection="A reflection." wentWell="" challenges="" left="" />);
    fireEvent.click(screen.getByRole("button", { name: "Analyze Reflection" }));
    await screen.findByText(analysis.summary);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss feedback" }));
    await waitFor(() => expect(screen.queryByText(analysis.summary)).not.toBeInTheDocument());
  });

  it("ignores an analysis response after the reflection changes", async () => {
    let resolveRequest!: (value: { success: true; analysis: typeof analysis }) => void;
    vi.mocked(analyzeReflection).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const props = { reflection: "First reflection.", wentWell: "", challenges: "", left: "" };
    const view = render(<ReflectionAnalyzer {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Analyze Reflection" }));
    view.rerender(<ReflectionAnalyzer {...props} reflection="Edited reflection." />);
    resolveRequest({ success: true, analysis });
    await waitFor(() => expect(screen.queryByText(analysis.summary)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Analyze Reflection" })).toBeEnabled();
  });
});
