import { useState } from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoginPage from "./components/LoginPage";
import PatientList from "./components/PatientList";
import RecordsPanel from "./components/RecordsPanel";
import type { Patient } from "./lib/types";

/** Chooses between the login screen and the main screen, and shows who is signed in with which role. */
function Shell() {
  const { user, logout } = useAuth();
  const [selected, setSelected] = useState<Patient | null>(null);
  if (!user) return <LoginPage />;

  return (
    <div className="page">
      <header className="topbar">
        <strong>Medical Records</strong>
        <div className="topbar-right">
          {/* Role badge makes the access level visible (purple = admin, green = doctor) */}
          <span className={`badge ${user.role === "ADMIN" ? "badge-admin" : "badge-doctor"}`}>
            {user.role === "ADMIN" ? "Admin" : "Doctor"}
          </span>
          <span>{user.name}</span>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="layout">
        <PatientList selectedId={selected?.id ?? null} onSelect={setSelected} />
        {selected ? (
          // key resets the panel's state (page number, data) whenever another patient is selected
          <RecordsPanel key={selected.id} patient={selected} />
        ) : (
          <section className="card">
            <p className="muted">Select a patient to view records.</p>
          </section>
        )}
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