import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TeacherDashboard from "./TeacherDashboard";
import { fetchAdminPhaseConfig, fetchAdminPhaseProgress, fetchAdminHolidays, fetchAdminPhaseChangeRequests, reviewAdminPhaseChangeRequest, fetchAdminStudentGoals, fetchAdminStudentGrowth, fetchDailyGoals, fetchReports, fetchTeacherDashboardOverview, fetchWeeklyGoals } from "@/lib/api";

vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  fetchAdminStudentGoals: vi.fn(), fetchAdminStudentGrowth: vi.fn(), fetchDailyGoals: vi.fn(), fetchReports: vi.fn(),
  fetchAdminPhaseConfig: vi.fn(), fetchAdminPhaseProgress: vi.fn(), fetchAdminHolidays: vi.fn(), fetchAdminPhaseChangeRequests: vi.fn(), reviewAdminPhaseChangeRequest: vi.fn(),
  fetchTeacherDashboardOverview: vi.fn(), fetchWeeklyGoals: vi.fn(), updateAdminTask: vi.fn(), deleteAdminTask: vi.fn(),
}));

const overview = {
  success: true as const,
  data: {
    period: { startDate: "2026-09-27", endDate: "2026-10-03" }, page: 1, limit: 20, totalStudents: 1,
    overview: { activeStudents: 1, goalsCreated: 2, goalsCompleted: 1, completionPercent: 50, reflectionCoverage: 50, reflectionGoals: 1, dailyGoals: 2, tasksCompleted: 1, tasksRemaining: 1, taskScope: "accepted task plans on this page" },
    students: [{ id: "student-1", name: "Ari", email: "ari@example.test", goals: 2, dailyGoals: 2, completedGoals: 1, completionPercent: 50, reflections: 1, reflectionCoverage: 50, tasksCompleted: 1, tasksRemaining: 1, lastActivity: "2026-10-02", active: true }],
    commonChallenges: [{ text: "Need more time", count: 2 }],
    limitations: { phaseAvailable: false, challengeCounting: "exact text matches" },
  },
};

const phaseList = [{ name: "Induction", durationDays: 30, learningTopics: ["Day planning"], outcomes: [], prerequisites: null }, { name: "Phase 1", durationDays: 5, learningTopics: ["HTML"], outcomes: [], prerequisites: ["Induction"] }, { name: "Phase 2", durationDays: 13, learningTopics: ["CSS"], outcomes: [], prerequisites: ["Phase 1"] }, { name: "Phase 3", durationDays: 20, learningTopics: ["Quiz APP"], outcomes: [], prerequisites: ["Flowchart"] }];
const emptyPhaseResponse = { success: true as const, data: { students: [], page: 1, limit: 20, total: 0, phases: ["Induction", "Phase 1", "Phase 2", "Phase 3"], statusOptions: ["NOT_CONFIGURED", "NOT_STARTED", "ON_TRACK", "BEHIND", "DUE_SOON", "OVERDUE", "COMPLETED"], curriculum: phaseList } };
const renderPage = (phaseResponse = emptyPhaseResponse, requests: any[] = []) => {
  vi.mocked(fetchAdminPhaseProgress).mockResolvedValue(phaseResponse);
  vi.mocked(fetchAdminPhaseConfig).mockResolvedValue({ success: true, phaseDurations: { Induction: 30, "Phase 1": 5, "Phase 2": 13, "Phase 3": 20 }, phases: phaseList, induction: phaseList[0], curriculumContext: {}, dueSoonWorkingDays: 3 });
  vi.mocked(fetchAdminHolidays).mockResolvedValue({ success: true, holidays: [] });
  vi.mocked(fetchAdminPhaseChangeRequests).mockResolvedValue({ success: true, requests, curriculum: phaseList });
  return render(<MemoryRouter><TeacherDashboard /></MemoryRouter>);
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Teacher intelligence dashboard", () => {
  it("renders deterministic cohort-page metrics and a paginated student row", async () => {
    vi.mocked(fetchTeacherDashboardOverview).mockResolvedValue(overview);
    vi.mocked(fetchDailyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchWeeklyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchReports).mockResolvedValue({ reports: [] });
    renderPage();
    expect(await screen.findByText("Cohort overview")).toBeTruthy();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
    expect(screen.getByText("Ari")).toBeTruthy();
    expect(screen.getByText("Need more time · 2 mentions")).toBeTruthy();
    expect(screen.getByText(/Phase and status progress filters are available/)).toBeTruthy();
  });

  it("shows the same backend-calculated phase totals and deadlines in the Team table", async () => {
    vi.mocked(fetchTeacherDashboardOverview).mockResolvedValue(overview);
    vi.mocked(fetchDailyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchWeeklyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchReports).mockResolvedValue({ reports: [] });
    const phaseResponse = { success: true as const, data: {
      students: [{ student: { id: "student-1", name: "Rahul", email: "rahul@example.test" }, progress: {
        configured: true, phase: "Phase 2", phaseStartDate: "2026-10-01", requiredLearningDays: 13,
        learningDaysCompleted: 8, remainingLearningDays: 5, progressPercent: 61.54,
        baselineDeadline: "2026-10-17", currentDeadline: "2026-10-18", status: "ON_TRACK",
      } }],
      page: 1, limit: 20, total: 1, phases: ["Phase 2"], statusOptions: ["ON_TRACK"], curriculum: phaseList,
    } };
    renderPage(phaseResponse);
    expect(await screen.findByText("Rahul")).toBeTruthy();
    expect(screen.getAllByText("Phase 2").length).toBeGreaterThan(0);
    expect(screen.getByText("61.54%")).toBeTruthy();
    expect(screen.getByText("8/13 · 5 remaining")).toBeTruthy();
    expect(screen.getByText("17 Oct 2026")).toBeTruthy();
    expect(screen.getByText("18 Oct 2026")).toBeTruthy();
    expect(screen.getByText("ON TRACK")).toBeTruthy();
  });

  it("shows pending student phase requests and sends teacher decisions with the review comment", async () => {
    vi.mocked(fetchTeacherDashboardOverview).mockResolvedValue(overview);
    vi.mocked(fetchDailyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchWeeklyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchReports).mockResolvedValue({ reports: [] });
    vi.mocked(reviewAdminPhaseChangeRequest).mockResolvedValue({ success: true });
    const request = { _id: "request-1", currentPhase: "Phase 2", requestedPhase: "Phase 3", reason: "Ready for the next curriculum block.", status: "PENDING", requestedAt: "2026-10-05T00:00:00Z" };
    const row = {
      student: { id: "student-1", name: "Ari", email: "ari@example.test" }, request,
      progress: { configured: true, phase: "Phase 2", status: "ON_TRACK", requiredLearningDays: 13, learningDaysCompleted: 8, progressPercent: 61.54, currentDeadline: "2026-10-17" },
      phaseHistory: [], requestedPhaseCurriculum: phaseList[3],
    };
    renderPage(emptyPhaseResponse, [row]);
    expect(await screen.findByText(/Ari · Phase 2 → Phase 3/)).toBeTruthy();
    expect(screen.getAllByText("Quiz APP").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Review comment for Ari"), { target: { value: "Approved for the next stage." } });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(reviewAdminPhaseChangeRequest).toHaveBeenCalledWith("request-1", "approve", "Approved for the next stage."));
  });

  it("uses server-side search when the teacher searches", async () => {
    vi.mocked(fetchTeacherDashboardOverview).mockResolvedValue(overview);
    vi.mocked(fetchDailyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchWeeklyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchReports).mockResolvedValue({ reports: [] });
    renderPage();
    const search = await screen.findByRole("textbox", { name: "Search students" });
    fireEvent.change(search, { target: { value: "Ari" } });
    expect(await screen.findByText("Cohort overview")).toBeTruthy();
    expect(vi.mocked(fetchTeacherDashboardOverview)).toHaveBeenLastCalledWith({ search: "Ari", page: 1, limit: 20, days: 7 });
  });

  it("shows loading and a contained error state", async () => {
    let resolve!: (value: typeof overview) => void;
    vi.mocked(fetchTeacherDashboardOverview).mockReturnValue(new Promise((done) => { resolve = done; }));
    vi.mocked(fetchDailyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchWeeklyGoals).mockResolvedValue({ goals: [] });
    vi.mocked(fetchReports).mockResolvedValue({ reports: [] });
    renderPage();
    expect(document.querySelector(".animate-spin")).toBeTruthy();
    resolve(overview);
    expect(await screen.findByText("Cohort overview")).toBeTruthy();
    vi.mocked(fetchTeacherDashboardOverview).mockRejectedValueOnce(new Error("unavailable"));
    fireEvent.change(await screen.findByRole("combobox", { name: "Reporting period" }), { target: { value: "14" } });
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
