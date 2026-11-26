import type { Patient, RecordsPage, User } from "./types";

const TOKEN_KEY = "medrec.token";

// Trade-off: the token lives in sessionStorage. It survives a page refresh and is cleared when the
// tab closes, but JavaScript can read it, so an XSS bug could steal it. An httpOnly cookie would
// avoid that, at the cost of CSRF protection and more server setup.
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

// Called when any request gets 401 (expired / invalid token). Registered by AuthProvider,
// which avoids a circular import between this file and the auth context.
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

/** Single place that talks to the backend: adds the Bearer token and normalises errors. */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Some error responses may have no JSON body, so never let parsing throw.
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

  // Backend caps the limit at 50.
  searchPatients: (search: string, limit = 20) =>
    request<{ patients: Patient[] }>(`/patients?search=${encodeURIComponent(search)}&limit=${limit}`),

  // Backend caps the limit at 100. Role filtering happens on the server, not here.
  getRecords: (patientId: string, page: number, limit = 10) =>
    request<RecordsPage>(`/patients/${patientId}/records?page=${page}&limit=${limit}`),
};