import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { config } from "../config.js";

export const authRouter = Router();

/** POST /auth/login : exchanges username + password for a JWT. */
authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  // Only compare when the user exists, but answer identically in both failure cases
  // so an attacker cannot discover which usernames are valid.
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Token carries the user id (sub) and role; RBAC checks read these two claims.
  const token = jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresInSeconds,
  });

  // The password hash is never returned.
  return res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  });
});