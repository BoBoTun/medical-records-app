export type Role = "DOCTOR" | "ADMIN";

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string; // "YYYY-MM-DDT00:00:00.000Z"
}

export interface MedicalRecord {
  id: number;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  treatment: string;
  createdAt: string;
  doctor: { name: string };
}

export interface RecordsPage {
  patient: Patient | null; // null when a doctor has no records for this patient
  page: number;
  limit: number;
  total: number;
  records: MedicalRecord[];
}