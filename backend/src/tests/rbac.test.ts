/**
 * Integration tests for authentication, RBAC, validation and pagination of
 * POST /auth/login and GET /patients/:id/records.
 * They run against the real database (seeded with `npm run db:seed`) through supertest.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../db.js";

async function login(username: string, password: string): Promise<string> {
  const res = await request(app).post("/auth/login").send({ username, password });
  return res.body.token as string;
}

/** Calls the records endpoint; the token is optional so we can test the unauthenticated case. */
const get = (patientId: string, token?: string, query = "") => {
  const req = request(app).get(`/patients/${patientId}/records${query}`);
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
};

let adminToken: string;
let smithToken: string;
let smithId: string;
let patientWithSmith: string; // dr.smith has at least one record
let patientWithoutSmith: string; // has records, but none by dr.smith

beforeAll(async () => {
  adminToken = await login("admin", "admin123");
  smithToken = await login("dr.smith", "doctor123");

  const smith = await prisma.user.findUniqueOrThrow({ where: { username: "dr.smith" } });
  smithId = smith.id;

  const own = await prisma.medicalRecord.findFirstOrThrow({ where: { doctorId: smithId } });
  patientWithSmith = own.patientId;

  // A patient who has records, but none written by dr.smith.
  const other = await prisma.patient.findFirstOrThrow({
    where: { records: { some: {}, none: { doctorId: smithId } } },
  });
  patientWithoutSmith = other.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /auth/login", () => {
  it("returns a token for valid credentials", async () => {
    const res = await request(app).post("/auth/login").send({ username: "dr.smith", password: "doctor123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.role).toBe("DOCTOR");
  });

  it("rejects a wrong password and an unknown user with the same message", async () => {
    const wrong = await request(app).post("/auth/login").send({ username: "dr.smith", password: "nope" });
    const unknown = await request(app).post("/auth/login").send({ username: "ghost", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body); // identical, so usernames cannot be enumerated
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /patients/:id/records authentication", () => {
  it("returns 401 without a token", async () => {
    expect((await get(patientWithSmith)).status).toBe(401);
  });

  it("returns 401 with a garbage token", async () => {
    expect((await get(patientWithSmith, "not-a-real-token")).status).toBe(401);
  });
});

describe("GET /patients/:id/records authorization", () => {
  it("admin sees all records of a patient", async () => {
    const res = await get(patientWithSmith, adminToken);
    const own = await prisma.medicalRecord.count({ where: { patientId: patientWithSmith } });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(own);
  });

  it("doctor sees only the records they created", async () => {
    const res = await get(patientWithSmith, smithToken, "?limit=100");
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const record of res.body.records) {
      expect(record.doctorId).toBe(smithId);
    }
  });

  it("doctor gets an empty list for a patient they have no records for", async () => {
    const res = await get(patientWithoutSmith, smithToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.records).toEqual([]);
    expect(res.body.patient).toBeNull(); // patient details stay hidden too
  });

  it("admin can read a patient that dr.smith cannot", async () => {
    const res = await get(patientWithoutSmith, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
  });
});

describe("GET /patients/:id/records validation and pagination", () => {
  it("returns 400 for a malformed patient id", async () => {
    expect((await get("123", adminToken)).status).toBe(400);
  });

  it("returns 404 when an admin asks for a patient that does not exist", async () => {
    const res = await get("00000000-0000-4000-8000-000000000000", adminToken);
    expect(res.status).toBe(404);
  });

  it("paginates and caps the page size at 100", async () => {
    const res = await get(patientWithoutSmith, adminToken, "?page=1&limit=5000");
    expect(res.body.limit).toBe(100);
    expect(res.body.records.length).toBeLessThanOrEqual(100);
  });
});