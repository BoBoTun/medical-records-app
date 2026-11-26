import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type Role = "DOCTOR" | "ADMIN";
export interface AuthUser {
  id: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

/** Verifies the Bearer token and attaches { id, role } to req.user. */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    if (typeof payload === "string" || !payload.sub || (payload.role !== "DOCTOR" && payload.role !== "ADMIN")) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}