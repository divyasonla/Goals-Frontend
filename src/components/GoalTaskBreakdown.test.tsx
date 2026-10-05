import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoalTaskBreakdown from "@/components/GoalTaskBreakdown";
import { acceptTaskBreakdown, breakdownGoal, fetchMyTaskBreakdowns } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  acceptTaskBreakdown: vi.fn(),
  breakdownGoal: vi.fn(),
  fetchMyTaskBreakdowns: vi.fn(),
}));

const aiTasks = [
  { _id: "1", sourceTaskId: "source-1", source: "ai" as const, title: "Review React components", description: "Review components and props.", order: 1 },
  { _id: "2", sourceTaskId: "source-2", source: "ai" as const, title: "Practice hooks", description: "Build a small state example.", order: 2 },
  { _id: "3", sourceTaskId: "source-3", source: "ai" as const, title: "Set up a project", description: "Create the folders and routes.", order: 3 },
  { _id: "4", sourceTaskId: "source-4", source: "ai" as const, title: "Review the result", description: "Check the work against the goal.", order: 4 },
];

describe("GoalTaskBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchMyTaskBreakdowns).mockResolvedValue({ success: true, breakdowns: [] });
    vi.mocked(breakdownGoal).mockResolvedValue({ success: true, breakdown: { id: "breakdown-id", goal: "Build a React project", timeframe: "weekly", tasks: aiTasks } });
    vi.mocked(acceptTaskBreakdown).mockResolvedValue({ success: true, breakdown: { id: "breakdown-id", goal: "Build a React project", timeframe: "weekly", tasks: aiTasks, accepted: true } });
  });

  it("generates and renders editable AI tasks without changing the original goal", async () => {
    const goal = "Build a React project";
    render(<GoalTaskBreakdown goal={goal} timeframe="weekly" />);
    fireEvent.click(screen.getByRole("button", { name: "Break Into Tasks" }));
    expect(await screen.findByDisplayValue("Review React components")).toBeInTheDocument();
    expect(breakdownGoal).toHaveBeenCalledWith(goal, "weekly");
    expect(goal).toBe("Build a React project");
  });

  it("shows a loading state during generation", async () => {
    let resolveRequest!: (response: Awaited<ReturnType<typeof breakdownGoal>>) => void;
    vi.mocked(breakdownGoal).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<GoalTaskBreakdown goal="Study React" timeframe="daily" />);
    fireEvent.click(screen.getByRole("button", { name: "Break Into Tasks" }));
    expect(screen.getByRole("button", { name: "Creating tasks..." })).toBeDisabled();
    resolveRequest({ success: true, breakdown: { id: "draft", goal: "Study React", timeframe: "daily", tasks: aiTasks } });
    await screen.findByDisplayValue("Review React components");
  });

  it("allows editing, removing, adding a custom task, and accepting tasks", async () => {
    render(<GoalTaskBreakdown goal="Build a React project" timeframe="weekly" />);
    fireEvent.click(screen.getByRole("button", { name: "Break Into Tasks" }));
    const title = await screen.findByDisplayValue("Review React components");
    fireEvent.change(title, { target: { value: "Read component documentation" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove task" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Add My Task" }));
    const customTitle = screen.getByRole("textbox", { name: "Task 4 title" });
    fireEvent.change(customTitle, { target: { value: "Write a small component" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Task 4 description" }), { target: { value: "Build one reusable component." } });
    fireEvent.click(screen.getByRole("button", { name: "Use These Tasks" }));
    await waitFor(() => expect(acceptTaskBreakdown).toHaveBeenCalled());
    expect(acceptTaskBreakdown).toHaveBeenCalledWith("breakdown-id", expect.arrayContaining([
      expect.objectContaining({ title: "Read component documentation" }),
      expect.objectContaining({ title: "Write a small component", source: "student" }),
    ]));
    expect(await screen.findByRole("button", { name: "Tasks Saved" })).toBeDisabled();
  });

  it("allows regenerating task suggestions", async () => {
    render(<GoalTaskBreakdown goal="Study React" timeframe="daily" />);
    fireEvent.click(screen.getByRole("button", { name: "Break Into Tasks" }));
    await screen.findByDisplayValue("Review React components");
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    await waitFor(() => expect(breakdownGoal).toHaveBeenCalledTimes(2));
  });

  it("displays generation failures without affecting the goal form", async () => {
    vi.mocked(breakdownGoal).mockRejectedValue(new Error("Task breakdown unavailable"));
    render(<GoalTaskBreakdown goal="Study React" timeframe="daily" />);
    fireEvent.click(screen.getByRole("button", { name: "Break Into Tasks" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Task breakdown unavailable");
  });

  it("ignores a stale response when the source goal changes", async () => {
    let resolveRequest!: (response: Awaited<ReturnType<typeof breakdownGoal>>) => void;
    vi.mocked(breakdownGoal).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const view = render(<GoalTaskBreakdown goal="First goal" timeframe="daily" />);
    fireEvent.click(screen.getByRole("button", { name: "Break Into Tasks" }));
    view.rerender(<GoalTaskBreakdown goal="Updated goal" timeframe="daily" />);
    resolveRequest({ success: true, breakdown: { id: "draft", goal: "First goal", timeframe: "daily", tasks: aiTasks } });
    await waitFor(() => expect(screen.queryByDisplayValue("Review React components")).not.toBeInTheDocument());
  });
});
