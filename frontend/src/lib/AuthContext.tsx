import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { User } from "./types";

const USER_KEY = "medrec.user";

interface AuthState {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Restores the logged-in user after a page refresh. The backend has no /auth/me, so the user is stored too. */
function loadUser(): User | null {
  try {
    // Only trust the stored user if a token is also present.
    if (!tokenStore.get()) return null;
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/**
 * Holds the current user for the whole app (similar to a shared ViewModel in mobile apps).
 * UI role checks only change what is displayed; real enforcement is on the server.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const logout = useCallback(() => {
    tokenStore.clear();
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token, user } = await api.login(username, password);
    tokenStore.set(token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
  }, []);

  // Any 401 from the API (expired/invalid token) logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Memoised so consumers only re-render when something really changes.
  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}