import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";

export const patientsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /patients?search=&limit=
 * Name search used by the frontend to pick a patient.
 * Assumption: a doctor's "assigned patients" are the patients they have written a record for.
 */
patientsRouter.get("/", authenticate, async (req, res) => {
  const search = String(req.query.search ?? "").trim().slice(0, 100);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const user = req.user!; // set by authenticate

  const where: Prisma.PatientWhereInput = {};

  // Case-insensitive substring match (ILIKE '%x%'), served by the pg_trgm GIN index on patients.name.
  if (search) where.name = { contains: search, mode: "insensitive" };

  // RBAC: doctors only see patients they have written a record for.
  // The doctor id comes from the token, never from the client.
  // Admins get no extra filter, so they see every patient.
  if (user.role === "DOCTOR") where.records = { some: { doctorId: user.id } };

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }], // id as tie-breaker keeps the order stable
    take: limit,
    select: { id: true, name: true, dateOfBirth: true },
  });

  return res.json({ patients });
});

/**
 * GET /patients/:id/records?page=&limit=
 * Paginated medical history of one patient, newest first.
 *   Admin  : all records of the patient.
 *   Doctor : only the records that doctor created.
 */
patientsRouter.get("/:id/records", authenticate, async (req, res) => {
  const patientId = String(req.params.id);
  if (!UUID_RE.test(patientId)) {
    return res.status(400).json({ error: "Invalid patient id" });
  }

  // Sanitise paging input: page >= 1, 1 <= limit <= 100 (protects the database from huge pages).
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));

  const user = req.user!; // set by authenticate
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });

  // Only admins are told whether a patient exists. A doctor gets the same empty answer
  // for "no such patient" and "not your patient", so ids cannot be probed.
  if (user.role === "ADMIN" && !patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  // RBAC: the doctorId filter comes from the token, never from the request.
  const where = user.role === "ADMIN" ? { patientId } : { patientId, doctorId: user.id };

  // Count and page are independent, so run them in parallel.
  const [total, records] = await Promise.all([
    prisma.medicalRecord.count({ where }),
    prisma.medicalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" }, // matches the (patient_id, created_at DESC) indexes
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        diagnosis: true,
        treatment: true,
        createdAt: true,
        doctor: { select: { name: true } },
      },
    }),
  ]);

  return res.json({
    // Do not reveal patient details to a doctor who has no records for this patient.
    patient: user.role === "ADMIN" || total > 0 ? patient : null,
    page,
    limit,
    total,
    records,
  });
});