const BACKEND_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

async function callBackend(endpoint: string, body: Record<string, unknown>, authenticated = false) {
  const token = authenticated ? sessionStorage.getItem("goal_tracker_token") : null;
  const res = await fetch(`${BACKEND_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// Auth
export const login = (email: string, password: string) =>
  callBackend("login", { email, password });

export const signup = (username: string, email: string, password: string, role: string) =>
  callBackend("signup", { name: username, email, password, role });

// Forgot Password
export const forgotPassword = (email: string) =>
  callBackend("forgot-password", { email });

// Reset Password
export const resetPassword = (token: string, newPassword: string) =>
  callBackend("reset-password", { token, newPassword });


// Daily Goals
export interface GoalAnalysis {
  score: number;
  isSpecific: boolean;
  isMeasurable: boolean;
  isClear: boolean;
  isAchievable: boolean;
  isTimeBound: boolean;
  reason: string;
  improvedGoal: string;
}

export const analyzeGoal = (goal: string, timeframe: "daily" | "weekly"): Promise<{ success: true; analysis: GoalAnalysis }> =>
  callBackend("analyze-goal", { goal, timeframe }, true) as Promise<{ success: true; analysis: GoalAnalysis }>;

export interface ReflectionAnalysis {
  score: number;
  strengths: string[];
  challenges: string[];
  suggestions: string[];
  nextAction: string;
  summary: string;
}

export interface ReflectionInput {
  reflection: string;
  wentWell: string;
  challenges: string;
  left: string;
}

export const analyzeReflection = (reflection: ReflectionInput): Promise<{ success: true; analysis: ReflectionAnalysis }> =>
  callBackend("analyze-reflection", { ...reflection }, true) as Promise<{ success: true; analysis: ReflectionAnalysis }>;

export type GoalTask = {
  _id?: string;
  title: string;
  description: string;
  order: number;
  status?: "Pending" | "In Progress" | "Completed";
  source?: "ai" | "student" | "admin";
  sourceTaskId?: string | null;
};

export type GoalTaskBreakdown = {
  _id?: string;
  id?: string;
  goal: string;
  timeframe: "daily" | "weekly";
  tasks: GoalTask[];
  accepted?: boolean;
  studentName?: string;
  studentEmail?: string;
  createdAt?: string;
};

async function callAuthenticatedApi(path: string, method = "POST", body?: Record<string, unknown>) {
  const token = sessionStorage.getItem("goal_tracker_token");
  const response = await fetch(`${BACKEND_URL}/${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({ error: "Unknown error" }));
  if (!response.ok) throw new Error(data.error || `Request failed with status ${response.status}`);
  return data;
}

export const breakdownGoal = (goal: string, timeframe: "daily" | "weekly") =>
  callAuthenticatedApi("breakdown-goal", "POST", { goal, timeframe }) as Promise<{ success: true; breakdown: GoalTaskBreakdown }>;

export const fetchMyTaskBreakdowns = (goal: string, timeframe: "daily" | "weekly") =>
  callAuthenticatedApi("task-breakdowns/mine", "POST", { goal, timeframe }) as Promise<{ success: true; breakdowns: GoalTaskBreakdown[] }>;

export const acceptTaskBreakdown = (breakdownId: string, tasks: GoalTask[]) =>
  callAuthenticatedApi(`task-breakdowns/${encodeURIComponent(breakdownId)}/accept`, "POST", { tasks }) as Promise<{ success: true; breakdown: GoalTaskBreakdown }>;

export const fetchAdminStudents = () =>
  callAuthenticatedApi("admin/students", "GET") as Promise<{ success: true; students: Array<{ _id: string; name: string; email: string }> }>;

export interface TeacherOverviewStudent {
  id: string;
  name: string;
  email: string;
  goals: number;
  dailyGoals: number;
  completedGoals: number;
  completionPercent: number | null;
  reflections: number;
  reflectionCoverage: number | null;
  tasksCompleted: number;
  tasksRemaining: number;
  lastActivity: string | null;
  active: boolean;
}

export interface TeacherDashboardOverview {
  period: { startDate: string; endDate: string };
  page: number;
  limit: number;
  totalStudents: number;
  overview: {
    activeStudents: number;
    goalsCreated: number;
    goalsCompleted: number;
    completionPercent: number | null;
    reflectionCoverage: number | null;
    reflectionGoals: number;
    dailyGoals: number;
    tasksCompleted: number;
    tasksRemaining: number;
    taskScope: string;
  };
  students: TeacherOverviewStudent[];
  commonChallenges: Array<{ text: string; count: number }>;
  limitations: { phaseAvailable: boolean; challengeCounting: string };
}

export const fetchTeacherDashboardOverview = (params: { search?: string; page?: number; limit?: number; days?: number }) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 20));
  query.set("days", String(params.days || 7));
  return callAuthenticatedApi(`admin/dashboard/overview?${query.toString()}`, "GET") as Promise<{
    success: true;
    data: TeacherDashboardOverview;
  }>;
};

export const fetchAdminStudentGoals = (studentId: string) =>
  callAuthenticatedApi(`admin/students/${encodeURIComponent(studentId)}/goals`, "GET") as Promise<{
    success: true;
    student: { _id: string; name: string; email: string };
    goals: { daily: Array<{ goal: string; timeframe: string; date: string; status: string; reflection?: string; wentWell?: string; challenges?: string; left?: string }>; weekly: Array<{ goal: string; timeframe: string; date: string; status: string; reflection?: string; wentWell?: string; challenges?: string; left?: string }> };
    breakdowns: GoalTaskBreakdown[];
  }>;

export const updateAdminTask = (taskId: string, task: GoalTask) =>
  callAuthenticatedApi(`admin/tasks/${encodeURIComponent(taskId)}`, "PATCH", task as unknown as Record<string, unknown>);

export const deleteAdminTask = (taskId: string) =>
  callAuthenticatedApi(`admin/tasks/${encodeURIComponent(taskId)}`, "DELETE");

export const fetchGeminiKeySettings = () =>
  callAuthenticatedApi("settings/gemini-key", "GET") as Promise<{ success: true; configured: boolean; updatedAt: string | null }>;

export const saveGeminiApiKey = (apiKey: string) =>
  callAuthenticatedApi("settings/gemini-key", "PUT", { apiKey }) as Promise<{ success: true; configured: true; message: string }>;

export const removeGeminiApiKey = () =>
  callAuthenticatedApi("settings/gemini-key", "DELETE") as Promise<{ success: true; configured: false; message: string }>;

export interface GrowthPeriodMetrics {
  period: { startDate: string; endDate: string };
  dailyGoals: { total: number; completed: number; inProgress: number; unfinished: number; completionPercent: number | null };
  weeklyGoals: { total: number; completed: number; inProgress: number; unfinished: number; completionPercent: number | null };
  reflectionCoverage: { count: number; totalDailyGoals: number; percent: number | null };
  reflectionCount: number;
}

export interface GrowthInsightsData {
  period: { startDate: string; endDate: string };
  metrics: {
    current: GrowthPeriodMetrics;
    previous: GrowthPeriodMetrics;
    taskCompletion: { scope: string; total: number; completed: number };
  };
  observed: string[];
  insights: {
    summary: string;
    strengths: string[];
    improvements: string[];
    repeatedChallenges: string[];
    unfinishedPatterns: string[];
    nextActions: string[];
    confidence: "low" | "medium" | "high";
  } | null;
  aiStatus: "ready" | "generated" | "missing_key" | "insufficient_data" | "unavailable";
  aiMessage: string | null;
  dataSufficient: boolean;
  keyConfigured: boolean | null;
}

export const fetchGrowthInsights = () =>
  callAuthenticatedApi("growth-insights", "GET") as Promise<{ success: true; data: GrowthInsightsData }>;

export interface PhaseProgress {
  configured: boolean;
  phase: string | null;
  phaseDetails?: CurriculumPhase | null;
  phaseStartDate: string | null;
  status: "NOT_CONFIGURED" | "NOT_STARTED" | "ON_TRACK" | "BEHIND" | "DUE_SOON" | "OVERDUE" | "COMPLETED";
  requiredLearningDays?: number;
  learningDaysCompleted?: number;
  remainingLearningDays?: number;
  progressPercent?: number;
  learningDates?: string[];
  baselineDeadline?: string;
  currentDeadline?: string;
  completedOn?: string | null;
  overdueDays?: number;
  extensionDays?: number;
  extensionReasons?: string[];
  timezone?: string;
  message?: string;
  deadlineNote?: string;
  holidays?: Array<{ date: string; name: string }>;
  phaseHistory?: PhaseHistoryEntry[];
  phaseChangeRequests?: PhaseChangeRequest[];
  curriculum?: { source: string; phases: CurriculumPhase[]; induction: { name: string; durationDays: number; learningTopics: string[] }; context: Record<string, unknown> };
}

export interface CurriculumPhase {
  name: string;
  durationDays: number;
  learningTopics: string[];
  outcomes: string[];
  prerequisites: string[] | null;
  problemSolvingTrack?: string | null;
}

export interface PhaseChangeRequest {
  _id: string;
  currentPhase: string;
  requestedPhase: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewComment?: string;
  newPhaseStartDate?: string | null;
}

export interface PhaseHistoryEntry {
  phase: string;
  phaseStartDate: string;
  phaseEndDate: string;
  requiredLearningDays: number;
  learningDaysCompleted: number;
  learningDates?: string[];
  remainingLearningDays: number;
  progressPercent: number;
  baselineDeadline: string;
  currentDeadline: string;
  status: string;
  completedOn?: string | null;
}

export interface PhaseChangeReviewRow {
  student: { id: string; name: string; email: string };
  request: PhaseChangeRequest;
  progress: PhaseProgress;
  phaseHistory: PhaseHistoryEntry[];
  requestedPhaseCurriculum: CurriculumPhase | null;
}

export const fetchMyPhaseProgress = () =>
  callAuthenticatedApi("phase-progress", "GET") as Promise<{ success: true; data: PhaseProgress }>;

export interface AdminPhaseProgressRow {
  student: { id: string; name: string; email: string };
  progress: PhaseProgress;
}

export const fetchAdminPhaseProgress = (params: { page?: number; limit?: number; phase?: string; status?: string; search?: string }) => {
  const query = new URLSearchParams();
  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 20));
  if (params.phase && params.phase !== "all") query.set("phase", params.phase);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  return callAuthenticatedApi(`admin/phase-progress?${query.toString()}`, "GET") as Promise<{
    success: true;
    data: { students: AdminPhaseProgressRow[]; page: number; limit: number; total: number; phases: string[]; statusOptions: string[]; curriculum: CurriculumPhase[] };
  }>;
};

export const fetchAdminStudentPhaseProgress = (studentId: string) =>
  callAuthenticatedApi(`admin/students/${encodeURIComponent(studentId)}/phase-progress`, "GET") as Promise<{
    success: true;
    student: { id: string; name: string; email: string };
    data: PhaseProgress;
  }>;

export const assignStudentPhase = (studentId: string, data: { phase: string; phaseStartDate: string; timezone?: string }) =>
  callAuthenticatedApi(`admin/students/${encodeURIComponent(studentId)}/phase`, "PATCH", data as unknown as Record<string, unknown>);

export const fetchAdminPhaseConfig = () =>
  callAuthenticatedApi("admin/phase-config", "GET") as Promise<{ success: true; phaseDurations: Record<string, number>; phases: CurriculumPhase[]; induction: { name: string; durationDays: number; learningTopics: string[] }; curriculumContext: Record<string, unknown>; dueSoonWorkingDays: number }>;

export const updateAdminPhaseConfig = (phaseDurations: Record<string, number>) =>
  callAuthenticatedApi("admin/phase-config", "PATCH", { phaseDurations });

export const createPhaseChangeRequest = (requestedPhase: string, reason: string) =>
  callAuthenticatedApi("phase-change-requests", "POST", { requestedPhase, reason }) as Promise<{ success: true; request: PhaseChangeRequest }>;

export const fetchMyPhaseChangeRequests = () =>
  callAuthenticatedApi("phase-change-requests/mine", "GET") as Promise<{ success: true; currentPhase: string | null; phaseStartDate: string | null; requests: PhaseChangeRequest[]; history: PhaseHistoryEntry[] }>;

export const fetchAdminPhaseChangeRequests = (status: "PENDING" | "APPROVED" | "REJECTED" | "ALL" = "PENDING") =>
  callAuthenticatedApi(`admin/phase-change-requests?status=${status}`, "GET") as Promise<{ success: true; requests: PhaseChangeReviewRow[]; curriculum: CurriculumPhase[] }>;

export const reviewAdminPhaseChangeRequest = (requestId: string, decision: "approve" | "reject", reviewComment = "") =>
  callAuthenticatedApi(`admin/phase-change-requests/${encodeURIComponent(requestId)}`, "PATCH", { decision, reviewComment });

export const fetchAdminHolidays = () =>
  callAuthenticatedApi("admin/holidays", "GET") as Promise<{ success: true; holidays: Array<{ _id: string; date: string; name: string }> }>;

export const addAdminHoliday = (date: string, name: string) =>
  callAuthenticatedApi("admin/holidays", "POST", { date, name });

export const deleteAdminHoliday = (holidayId: string) =>
  callAuthenticatedApi(`admin/holidays/${encodeURIComponent(holidayId)}`, "DELETE");

export const askStudentMentor = (message: string, history: Array<{ question: string; answer: string }> = []) =>
  callAuthenticatedApi("student-mentor", "POST", { message, history }) as Promise<{
    success: true;
    data: { answer: string; suggestedActions: string[] };
  }>;

export interface AdminStudentGrowthData {
  student: { id: string; name: string };
  period: { startDate: string; endDate: string };
  metrics: {
    current: GrowthPeriodMetrics;
    previous: GrowthPeriodMetrics;
    taskCompletion: { scope: string; total: number; completed: number };
  };
  observedEvidence: string[];
  aiInsights: Array<{
    period?: { startDate: string; endDate: string; timezone?: string };
    insights: { summary: string; strengths: string[]; learning: string[]; challenges: string[]; unfinished: string[]; nextActions: string[] };
    evidence: string;
  }>;
}

export const fetchAdminStudentGrowth = (studentId: string) =>
  callAuthenticatedApi(`admin/students/${encodeURIComponent(studentId)}/growth-insights`, "GET") as Promise<{
    success: true;
    data: AdminStudentGrowthData;
  }>;

export const fetchDailyGoals = (email?: string) =>
  callBackend("daily-goals", { action: "fetch", email }, true);

export const addDailyGoal = (data: {
  username: string; email: string; dailyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; status?: string;
}) => callBackend("daily-goals", { action: "add", ...data }, true);

export const updateDailyGoal = (data: {
  rowIndex: number; username: string; email: string; dailyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; date: string; status?: string;
}) => callBackend("daily-goals", { action: "update", ...data }, true);

export const deleteDailyGoal = (rowIndex: number, email: string) =>
  callBackend("daily-goals", { action: "delete", rowIndex, email }, true);

// Weekly Goals
export const fetchWeeklyGoals = (email?: string) =>
  callBackend("weekly-goals", { action: "fetch", email }, true);

export const addWeeklyGoal = (data: {
  username: string; email: string; weeklyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; status?: string;
}) => callBackend("weekly-goals", { action: "add", ...data }, true);

export const updateWeeklyGoal = (data: {
  rowIndex: number; username: string; email: string; weeklyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; week: string; status?: string;
}) => callBackend("weekly-goals", { action: "update", ...data }, true);

export const deleteWeeklyGoal = (rowIndex: number, email: string) =>
  callBackend("weekly-goals", { action: "delete", rowIndex, email }, true);

// Reports
export const generateReport = (email: string, username: string, reportingTimezone?: string) =>
  callBackend("generate-report", { email, username, reportingTimezone }, true);

export const fetchReports = (email?: string) =>
  callBackend("fetch-reports", { email }, true);
