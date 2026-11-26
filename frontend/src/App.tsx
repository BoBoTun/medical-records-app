import { useState } from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoginPage from "./components/LoginPage";
import PatientList from "./components/PatientList";
import type { Patient } from "./lib/types";

function Shell() {
  const { user, logout } = useAuth();
  const [selected, setSelected] = useState<Patient | null>(null);
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
      <main className="layout">
        <PatientList selectedId={selected?.id ?? null} onSelect={setSelected} />
        <section className="card">
          {selected ? (
            <>
              <h2>{selected.name}</h2>
              <p className="muted">Records table comes next.</p>
            </>
          ) : (
            <p className="muted">Select a patient to view records.</p>
          )}
        </section>
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