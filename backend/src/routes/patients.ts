import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";

export const patientsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /patients?search=&limit= : name search, scoped by role. */
patientsRouter.get("/", authenticate, async (req, res) => {
  const search = String(req.query.search ?? "").trim().slice(0, 100);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const user = req.user!;

  const where: Prisma.PatientWhereInput = {};
  if (search) where.name = { contains: search, mode: "insensitive" };
  // RBAC: doctors only see patients they have written a record for. Id comes from the token.
  if (user.role === "DOCTOR") where.records = { some: { doctorId: user.id } };

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }], // stable order
    take: limit,
    select: { id: true, name: true, dateOfBirth: true },
  });

  return res.json({ patients });
});

/** GET /patients/:id/records : paginated records, scoped by role. */
patientsRouter.get("/:id/records", authenticate, async (req, res) => {
  const patientId = String(req.params.id);
  if (!UUID_RE.test(patientId)) {
    return res.status(400).json({ error: "Invalid patient id" });
  }

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));

  const user = req.user!; // set by authenticate
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });

  if (user.role === "ADMIN" && !patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  // RBAC: doctors only see records they created. doctorId comes from the token, never from the request.
  const where = user.role === "ADMIN" ? { patientId } : { patientId, doctorId: user.id };

  const [total, records] = await Promise.all([
    prisma.medicalRecord.count({ where }),
    prisma.medicalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
    patient: user.role === "ADMIN" || total > 0 ? patient : null,
    page,
    limit,
    total,
    records,
  });
});