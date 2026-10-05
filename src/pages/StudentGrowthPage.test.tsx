import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import StudentGrowthPage from "./StudentGrowthPage";
import { fetchGrowthInsights } from "@/lib/api";

vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/api", () => ({ fetchGrowthInsights: vi.fn() }));

const makeData = (overrides = {}) => ({
  success: true as const,
  data: {
    period: { startDate: "2026-09-27", endDate: "2026-10-03" },
    metrics: {
      current: {
        period: { startDate: "2026-09-27", endDate: "2026-10-03" },
        dailyGoals: { total: 7, completed: 5, inProgress: 1, unfinished: 2, completionPercent: 71 },
        weeklyGoals: { total: 2, completed: 1, inProgress: 0, unfinished: 1, completionPercent: 50 },
        reflectionCoverage: { count: 6, totalDailyGoals: 7, percent: 86 }, reflectionCount: 6,
      },
      previous: {
        period: { startDate: "2026-09-20", endDate: "2026-09-26" },
        dailyGoals: { total: 5, completed: 3, inProgress: 0, unfinished: 2, completionPercent: 60 },
        weeklyGoals: { total: 1, completed: 1, inProgress: 0, unfinished: 0, completionPercent: 100 },
        reflectionCoverage: { count: 3, totalDailyGoals: 5, percent: 60 }, reflectionCount: 3,
      },
      taskCompletion: { scope: "recent accepted plans", total: 8, completed: 5 },
    },
    observed: ["Daily goals: 5 of 7 completed."],
    insights: {
      summary: "You completed five daily goals this week.", strengths: ["You recorded six reflections."],
      improvements: ["Completion increased by eleven points."], repeatedChallenges: ["Time planning appeared twice."],
      unfinishedPatterns: ["Two daily goals are unfinished."], nextActions: ["Choose one small step tomorrow."], confidence: "medium" as const,
    },
    aiStatus: "generated" as const, aiMessage: null, dataSufficient: true, keyConfigured: true,
    ...overrides,
  },
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><StudentGrowthPage /></MemoryRouter></QueryClientProvider>);
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Student Growth Dashboard", () => {
  it("renders deterministic metrics, period comparisons, and labeled AI insights", async () => {
    vi.mocked(fetchGrowthInsights).mockResolvedValue(makeData());
    renderPage();
    expect(await screen.findByText("My Growth")).toBeTruthy();
    expect(screen.getByText("5 of 7 completed")).toBeTruthy();
    expect(screen.getByText("6 / 7")).toBeTruthy();
    expect(screen.getByText("AI growth insights")).toBeTruthy();
    expect(screen.getByText("Patterns to watch")).toBeTruthy();
    expect(screen.getByText(/Up 11 percentage points/)).toBeTruthy();
  });

  it("shows loading until growth data arrives", async () => {
    let resolve!: (value: ReturnType<typeof makeData>) => void;
    vi.mocked(fetchGrowthInsights).mockReturnValue(new Promise((done) => { resolve = done; }));
    renderPage();
    expect(screen.getByRole("status")).toBeTruthy();
    resolve(makeData());
    expect(await screen.findByText("My Growth")).toBeTruthy();
  });

  it("shows insufficient-data and missing-key states without inventing insights", async () => {
    vi.mocked(fetchGrowthInsights).mockResolvedValue(makeData({
      insights: null, aiStatus: "insufficient_data", aiMessage: "Not enough data yet.", dataSufficient: false, keyConfigured: false,
    }));
    renderPage();
    expect(await screen.findByText(/at least three recent goals/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Settings" })).toBeTruthy();
    expect(screen.queryByText("AI growth insights")).toBeNull();
  });

  it("shows a safe error state when the API fails", async () => {
    vi.mocked(fetchGrowthInsights).mockRejectedValue(new Error("database host secret"));
    renderPage();
    expect(await screen.findByText("We could not load your growth data. Please try again later.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("database host secret")).toBeNull());
  });
});
