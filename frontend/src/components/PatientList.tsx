import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import type { Patient } from "../lib/types";

interface Props {
  selectedId: string | null;
  onSelect: (patient: Patient) => void;
}

export default function PatientList({ selectedId, onSelect }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced search: wait 350ms after the last keystroke, ignore stale responses.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { patients } = await api.searchPatients(search.trim());
        if (cancelled) return;
        setPatients(patients);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load patients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const isAdmin = user?.role === "ADMIN";

  return (
    <section className="card patient-panel">
      <h2>{isAdmin ? "All patients" : "My patients"}</h2>
      <p className="muted small">
        {isAdmin
          ? "Admin access: every patient in the system."
          : "Only patients you have written records for."}
      </p>

      <input
        type="search"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div className="error">{error}</div>}

      <ul className="patient-list">
        {patients.map((p) => (
          <li key={p.id}>
            <button
              className={`patient-item ${p.id === selectedId ? "selected" : ""}`}
              onClick={() => onSelect(p)}
            >
              <span>{p.name}</span>
              <span className="muted small">DOB {p.dateOfBirth.slice(0, 10)}</span>
            </button>
          </li>
        ))}
      </ul>

      {loading && <p className="muted small">Loading...</p>}
      {!loading && !error && patients.length === 0 && <p className="muted small">No patients found.</p>}
    </section>
  );
}