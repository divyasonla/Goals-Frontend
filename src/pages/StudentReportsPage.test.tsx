import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentReportsPage from "@/pages/StudentReportsPage";
import { fetchReports, generateReport } from "@/lib/api";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { email: "student@example.test", username: "Student" } }) }));
vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api", () => ({ fetchReports: vi.fn(), generateReport: vi.fn() }));

const structuredReport = {
  username: "Student",
  email: "student@example.test",
  week: "2026-W40",
  completionPercent: 75,
  mainChallenges: "Time management",
  aiFeedback: "Legacy formatted report text",
  createdAt: "2026-10-03T16:00:00.000Z",
  aiStatus: "generated" as const,
  period: { startDate: "2026-09-27", endDate: "2026-10-03", timezone: "Asia/Kolkata" },
  metrics: {
    dailyGoals: { total: 8, completed: 6, inProgress: 1, pending: 1, completionPercent: 75 },
    weeklyGoals: { total: 2, completed: 1, completionPercent: 50 },
    reflectionCoverage: 6,
  },
  insights: {
    summary: "You made steady progress and identified one useful next step.",
    strengths: ["You completed six daily goals."],
    learning: ["You learned to split larger tasks."],
    challenges: ["Time management was a recurring challenge."],
    unfinished: ["Review the final exercise."],
    nextActions: ["Reserve 20 minutes for review tomorrow."],
  },
};

describe("StudentReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchReports).mockResolvedValue({ reports: [structuredReport] } as never);
    vi.mocked(generateReport).mockResolvedValue({ success: true } as never);
  });

  it("renders structured growth metrics and insight sections", async () => {
    render(<StudentReportsPage />);
    expect(await screen.findByText(structuredReport.insights.summary)).toBeInTheDocument();
    expect(screen.getByText("Daily goals: 6/8 completed (75%)")).toBeInTheDocument();
    expect(screen.getByText("Weekly goals: 1/2 completed (50%)")).toBeInTheDocument();
    expect(screen.getByText("Reflections: 6/8")).toBeInTheDocument();
    expect(screen.getByText("What Went Well")).toBeInTheDocument();
    expect(screen.getByText("You learned to split larger tasks.")).toBeInTheDocument();
    expect(screen.getByText("Next Week Focus")).toBeInTheDocument();
    expect(screen.queryByText("Legacy formatted report text")).not.toBeInTheDocument();
  });

  it("requests reports with the student's current local timezone", async () => {
    render(<StudentReportsPage />);
    await screen.findByText(structuredReport.insights.summary);
    fireEvent.click(screen.getAllByRole("button", { name: "Generate Report" })[0]);
    await waitFor(() => expect(generateReport).toHaveBeenCalledTimes(1));
    expect(generateReport).toHaveBeenCalledWith(
      "student@example.test",
      "Student",
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  });
});
