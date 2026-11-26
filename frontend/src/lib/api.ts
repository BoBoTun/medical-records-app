import type { Patient, RecordsPage, User } from "./types";

const TOKEN_KEY = "medrec.token";

// Token lives in sessionStorage: survives a page refresh, cleared when the tab closes.
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Called when any request gets 401 (expired / invalid token). Set by AuthProvider.
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // A 401 on /auth/login just means wrong password; only treat it as "session expired" elsewhere.
    if (res.status === 401 && !path.startsWith("/auth/login")) onUnauthorized();
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  searchPatients: (search: string, limit = 20) =>
    request<{ patients: Patient[] }>(`/patients?search=${encodeURIComponent(search)}&limit=${limit}`),

  getRecords: (patientId: string, page: number, limit = 10) =>
    request<RecordsPage>(`/patients/${patientId}/records?page=${page}&limit=${limit}`),
};