import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import type { Patient, RecordsPage } from "../lib/types";

const PAGE_SIZE = 10;

/**
 * Right panel: paginated medical records of the selected patient.
 * The server already filters by role (doctor: own records, admin: all);
 * the caption below only tells the user which view they are looking at.
 */
export default function RecordsPanel({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RecordsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New patient selected: back to page 1.
  useEffect(() => {
    setPage(1);
  }, [patient.id]);

  // Reload whenever the patient or page changes. `cancelled` ignores responses that arrive late.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getRecords(patient.id, page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load records");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patient.id, page]);

  const isAdmin = user?.role === "ADMIN";
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section className="card">
      <h2>{patient.name}</h2>
      <p className="muted small">
        DOB {patient.dateOfBirth.slice(0, 10)} ·{" "}
        {isAdmin ? "Showing records from all doctors." : "Showing only records you created."}
      </p>

      {error && <div className="error">{error}</div>}

      {data && (
        <>
          <table className="records">
            <thead>
              <tr>
                <th>Date</th>
                <th>Diagnosis</th>
                <th>Treatment</th>
                <th>Doctor</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((r) => (
                <tr key={r.id}>
                  <td>{r.createdAt.slice(0, 10)}</td>
                  <td>{r.diagnosis}</td>
                  <td>{r.treatment}</td>
                  <td>{r.doctor.name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.records.length === 0 && <p className="muted">No records available.</p>}

          <div className="pager">
            <span className="muted small">
              {data.total} record{data.total === 1 ? "" : "s"} · Page {data.page} of {totalPages}
            </span>
            <div>
              <button className="ghost" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>{" "}
              <button className="ghost" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {loading && !data && <p className="muted">Loading...</p>}
    </section>
  );
}