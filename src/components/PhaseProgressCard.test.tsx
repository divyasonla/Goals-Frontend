import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PhaseProgressCard from "./PhaseProgressCard";
import { createPhaseChangeRequest, fetchMyPhaseProgress } from "@/lib/api";

vi.mock("@/lib/api", () => ({ fetchMyPhaseProgress: vi.fn(), createPhaseChangeRequest: vi.fn() }));

const progress = {
  configured: true,
  phase: "Phase 2",
  phaseStartDate: "2026-10-01",
  requiredLearningDays: 13,
  learningDaysCompleted: 8,
  remainingLearningDays: 5,
  progressPercent: 61.54,
  baselineDeadline: "2026-10-17",
  currentDeadline: "2026-10-18",
  extensionDays: 1,
  extensionReasons: ["Approved leave"],
  learningDates: ["2026-10-01", "2026-10-02"],
  status: "ON_TRACK" as const,
  completedOn: null,
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("student phase progress", () => {
  it("shows the backend-calculated progress, dates, deadline, and extension", async () => {
    vi.mocked(fetchMyPhaseProgress).mockResolvedValue({ success: true, data: progress });
    render(<PhaseProgressCard />);
    expect(await screen.findByText("Phase 2 Progress")).toBeTruthy();
    expect(screen.getByText("8 / 13 learning days")).toBeTruthy();
    expect(screen.getByText("17 Oct 2026")).toBeTruthy();
    expect(screen.getByText("18 Oct 2026")).toBeTruthy();
    expect(screen.getByText(/Approved leave/)).toBeTruthy();
    expect(screen.getByText("ON TRACK")).toBeTruthy();
    expect(screen.getByText("Learning days counted")).toBeTruthy();
  });

  it("shows loading and a contained error when the progress endpoint fails", async () => {
    vi.mocked(fetchMyPhaseProgress).mockRejectedValue(new Error("unavailable"));
    render(<PhaseProgressCard />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Phase progress is temporarily unavailable.")).toBeTruthy();
  });

  it("lets the student request a phase with a reason and keeps the flow request-only", async () => {
    vi.mocked(fetchMyPhaseProgress).mockResolvedValue({ success: true, data: {
      ...progress,
      curriculum: { source: "Milestone 1.pdf", phases: [
        { name: "Phase 2", durationDays: 13, learningTopics: ["Apply CSS"], outcomes: [], prerequisites: ["Phase 1"] },
        { name: "Phase 3", durationDays: 20, learningTopics: ["Quiz APP"], outcomes: [], prerequisites: ["Flowchart"] },
      ], induction: { name: "Induction", durationDays: 30, learningTopics: [] }, context: {} },
      phaseChangeRequests: [], phaseHistory: [],
    } });
    vi.mocked(createPhaseChangeRequest).mockResolvedValue({ success: true, request: { _id: "request-1", currentPhase: "Phase 2", requestedPhase: "Phase 3", reason: "Ready", status: "PENDING", requestedAt: "2026-10-05T00:00:00Z" } });
    render(<PhaseProgressCard />);
    fireEvent.change(await screen.findByLabelText("Request a different phase"), { target: { value: "Phase 3" } });
    fireEvent.change(screen.getByLabelText("Reason for phase change"), { target: { value: "Ready for the next project." } });
    fireEvent.click(screen.getByRole("button", { name: "Request Phase Change" }));
    await waitFor(() => expect(createPhaseChangeRequest).toHaveBeenCalledWith("Phase 3", "Ready for the next project."));
    expect(await screen.findByText("Your request was sent to the Team for review.")).toBeTruthy();
    expect(screen.getByText("Phase 2 Progress")).toBeTruthy();
  });
});
