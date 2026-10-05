import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentDailyPage from "@/pages/StudentDailyPage";
import StudentWeeklyPage from "@/pages/StudentWeeklyPage";
import { deleteDailyGoal, deleteWeeklyGoal, fetchDailyGoals, fetchWeeklyGoals } from "@/lib/api";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "Student", email: "student@example.test" } }) }));
vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  addDailyGoal: vi.fn(), updateDailyGoal: vi.fn(), deleteDailyGoal: vi.fn(), fetchDailyGoals: vi.fn(),
  addWeeklyGoal: vi.fn(), updateWeeklyGoal: vi.fn(), deleteWeeklyGoal: vi.fn(), fetchWeeklyGoals: vi.fn(),
  fetchMyPhaseProgress: vi.fn().mockResolvedValue({ success: true, data: { configured: false, phase: null, phaseStartDate: null, status: "NOT_CONFIGURED" } }),
  analyzeGoal: vi.fn(), analyzeReflection: vi.fn(), breakdownGoal: vi.fn(), fetchMyTaskBreakdowns: vi.fn(), acceptTaskBreakdown: vi.fn(),
}));

describe("student goal deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(fetchDailyGoals).mockResolvedValueOnce({ goals: [
      { rowIndex: 7, username: "Student", email: "student@example.test", dailyGoal: "Finish today's reading", date: "2026-10-03", status: "Pending", reflection: "", wentWell: "", challenges: "", left: "" }
    ] }).mockResolvedValue({ goals: [] });
    vi.mocked(fetchWeeklyGoals).mockResolvedValueOnce({ goals: [
      { rowIndex: 8, username: "Student", email: "student@example.test", weeklyGoal: "Complete the weekly plan", week: "2026-W40", status: "Pending", reflection: "", wentWell: "", challenges: "", left: "" }
    ] }).mockResolvedValue({ goals: [] });
    vi.mocked(deleteDailyGoal).mockResolvedValue({ success: true });
    vi.mocked(deleteWeeklyGoal).mockResolvedValue({ success: true });
  });

  it("lets the student delete a daily goal after confirmation", async () => {
    render(<MemoryRouter><StudentDailyPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Delete daily goal from 2026-10-03" }));
    await waitFor(() => expect(deleteDailyGoal).toHaveBeenCalledWith(7, "student@example.test"));
    expect(window.confirm).toHaveBeenCalled();
  });

  it("shows the full daily goal and reflection in a read dialog", async () => {
    render(<MemoryRouter><StudentDailyPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "View daily goal from 2026-10-03" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Daily Goal Details")).toBeInTheDocument();
    expect(within(dialog).getByText("Finish today's reading")).toBeInTheDocument();
  });

  it("lets the student delete a weekly goal after confirmation", async () => {
    render(<MemoryRouter><StudentWeeklyPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Delete weekly goal from 2026-W40" }));
    await waitFor(() => expect(deleteWeeklyGoal).toHaveBeenCalledWith(8, "student@example.test"));
    expect(window.confirm).toHaveBeenCalled();
  });

  it("shows the full weekly goal and reflection in a read dialog", async () => {
    render(<MemoryRouter><StudentWeeklyPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "View weekly goal from 2026-W40" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Weekly Goal Details")).toBeInTheDocument();
    expect(within(dialog).getByText("Complete the weekly plan")).toBeInTheDocument();
  });
});
