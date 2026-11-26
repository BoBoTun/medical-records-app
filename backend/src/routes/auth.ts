import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { config } from "../config.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

   const token = jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresInSeconds,
  });

  return res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  });
});