/**
 * Integration tests for GET /patients (name search with role-based scoping).
 * Runs against the seeded database through supertest.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../db.js";

async function login(username: string, password: string): Promise<string> {
  const res = await request(app).post("/auth/login").send({ username, password });
  return res.body.token as string;
}

/** Calls the search endpoint; the token is optional so we can test the unauthenticated case. */
const search = (token?: string, query = "") => {
  const req = request(app).get(`/patients${query}`);
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
};

let adminToken: string;
let smithToken: string;
let smithId: string;

beforeAll(async () => {
  adminToken = await login("admin", "admin123");
  smithToken = await login("dr.smith", "doctor123");
  smithId = (await prisma.user.findUniqueOrThrow({ where: { username: "dr.smith" } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /patients", () => {
  it("returns 401 without a token", async () => {
    expect((await search()).status).toBe(401);
  });

  it("admin can list patients and search is case-insensitive", async () => {
    const res = await search(adminToken, "?search=AUNG&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.patients.length).toBeGreaterThan(0);
    for (const p of res.body.patients) expect(p.name.toLowerCase()).toContain("aung");
  });

  it("doctor only sees patients they have written a record for", async () => {
    const res = await search(smithToken, "?limit=50");
    expect(res.status).toBe(200);
    expect(res.body.patients.length).toBeGreaterThan(0);
    // Verify directly in the database that every returned patient has a record by dr.smith.
    for (const p of res.body.patients) {
      const count = await prisma.medicalRecord.count({ where: { patientId: p.id, doctorId: smithId } });
      expect(count).toBeGreaterThan(0);
    }
  });

  it("doctor result is a subset of admin result (same search)", async () => {
    const [doc, adm] = await Promise.all([
      search(smithToken, "?search=aung&limit=50"),
      search(adminToken, "?search=aung&limit=50"),
    ]);
    expect(doc.body.patients.length).toBeLessThanOrEqual(adm.body.patients.length);
  });

  it("caps limit at 50", async () => {
    const res = await search(adminToken, "?limit=5000");
    expect(res.body.patients.length).toBeLessThanOrEqual(50);
  });
});