import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StudentMentorPage from "./StudentMentorPage";
import { askStudentMentor } from "@/lib/api";

vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/api", () => ({ askStudentMentor: vi.fn() }));

const renderPage = () => render(<MemoryRouter><StudentMentorPage /></MemoryRouter>);

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("AI Student Mentor", () => {
  it("submits a question and displays the answer and suggested actions", async () => {
    vi.mocked(askStudentMentor).mockResolvedValue({ success: true, data: { answer: "Your recent entries show steady practice.", suggestedActions: ["Plan one short review."] } });
    renderPage();
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "What should I focus on this week?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask Mentor" }));
    expect(await screen.findByText("Your recent entries show steady practice.")).toBeTruthy();
    expect(screen.getByText("Plan one short review.")).toBeTruthy();
    expect(askStudentMentor).toHaveBeenCalledWith("What should I focus on this week?", []);
  });

  it("shows a loading state while the mentor responds", async () => {
    let resolve!: (value: { success: true; data: { answer: string; suggestedActions: string[] } }) => void;
    vi.mocked(askStudentMentor).mockReturnValue(new Promise((done) => { resolve = done; }));
    renderPage();
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "What next?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask Mentor" }));
    expect(screen.getByRole("button", { name: /Thinking/ })).toBeTruthy();
    resolve({ success: true, data: { answer: "Try a short review.", suggestedActions: [] } });
    expect(await screen.findByText("Try a short review.")).toBeTruthy();
  });

  it("does not submit an empty message", async () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Ask Mentor" }).hasAttribute("disabled")).toBe(true);
    await waitFor(() => expect(askStudentMentor).not.toHaveBeenCalled());
  });

  it("links the student to settings if a Gemini API key is missing", async () => {
    vi.mocked(askStudentMentor).mockRejectedValue(new Error("Please add your Gemini API key in Settings to use AI Mentor."));
    renderPage();
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "What next?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask Mentor" }));
    expect(await screen.findByText(/Please add your Gemini API key in Settings/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Settings" }).getAttribute("href")).toBe("/student/settings");
  });
});
