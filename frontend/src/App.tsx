import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoginPage from "./components/LoginPage";

function Shell() {
  const { user, logout } = useAuth();
  if (!user) return <LoginPage />;

  return (
    <div className="page">
      <header className="topbar">
        <strong>Medical Records</strong>
        <div className="topbar-right">
          <span className={`badge ${user.role === "ADMIN" ? "badge-admin" : "badge-doctor"}`}>
            {user.role === "ADMIN" ? "Admin" : "Doctor"}
          </span>
          <span>{user.name}</span>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        <p className="muted">Signed in. Patient search comes next.</p>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}