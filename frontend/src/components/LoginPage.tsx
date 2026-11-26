import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../lib/AuthContext";

/** Username/password form. On success the AuthContext updates and App swaps to the main screen. */
export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // disables the button to prevent double submits

  async function onSubmit(e: FormEvent) {
    e.preventDefault(); // stop the browser's full-page form submit
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Medical Records</h1>
        <p className="muted">Sign in to continue</p>

        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <p className="muted hint">
          Demo: <code>admin / admin123</code> · <code>dr.smith / doctor123</code>
        </p>
      </form>
    </div>
  );
}