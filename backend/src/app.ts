import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { patientsRouter } from "./routes/patients.js";

// The Express app is built here and started in server.ts,
// so tests can import it with supertest without opening a real port.
export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRouter); // POST /auth/login
app.use("/patients", patientsRouter); // GET /patients, GET /patients/:id/records