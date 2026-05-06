const BACKEND_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

async function callBackend(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${BACKEND_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
export const fetchDailyGoals = (email?: string) =>
  callBackend("daily-goals", { action: "fetch", email });

export const addDailyGoal = (data: {
  username: string; email: string; dailyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; status?: string;
}) => callBackend("daily-goals", { action: "add", ...data });

export const updateDailyGoal = (data: {
  rowIndex: number; username: string; email: string; dailyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; date: string; status?: string;
}) => callBackend("daily-goals", { action: "update", ...data });

// Weekly Goals
export const fetchWeeklyGoals = (email?: string) =>
  callBackend("weekly-goals", { action: "fetch", email });

export const addWeeklyGoal = (data: {
  username: string; email: string; weeklyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; status?: string;
}) => callBackend("weekly-goals", { action: "add", ...data });

export const updateWeeklyGoal = (data: {
  rowIndex: number; username: string; email: string; weeklyGoal: string;
  reflection?: string; wentWell?: string; challenges?: string; left?: string; week: string; status?: string;
}) => callBackend("weekly-goals", { action: "update", ...data });

// Reports
export const generateReport = (email: string, username: string) =>
  callBackend("generate-report", { email, username });

export const fetchReports = (email?: string) =>
  callBackend("fetch-reports", { email });
