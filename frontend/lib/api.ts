export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ApiError = {
  detail: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ detail: "Unexpected API error" }))) as ApiError;
    throw new Error(error.detail || "Unexpected API error");
  }

  return (await response.json()) as T;
}

export type User = {
  id: string;
  email: string;
};

export type SessionItem = {
  id: number;
  user_id: string;
  mode: string;
  audio_type: string;
  bpm: number;
  peak_count: number;
  duration_seconds: number;
  mood: string | null;
  started_at: string;
  notes: string | null;
};

export type SettingsItem = {
  preferred_mode: string;
  color_theme: string;
};

export const api = {
  register: (payload: { email: string; password: string }) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string; refresh_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () => request<User>("/auth/me"),

  getSettings: () => request<SettingsItem>("/settings"),

  updateSettings: (payload: SettingsItem) =>
    request<SettingsItem>("/settings", { method: "PUT", body: JSON.stringify(payload) }),

  createSession: (payload: {
    mode: string;
    audio_type: string;
    bpm: number;
    peak_count: number;
    duration_seconds: number;
    mood?: string;
    notes?: string;
  }) => request<SessionItem>("/sessions", { method: "POST", body: JSON.stringify(payload) }),

  listSessions: () => request<SessionItem[]>("/sessions"),
};
