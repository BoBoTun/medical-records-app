import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type Role = "DOCTOR" | "ADMIN";
export interface AuthUser {
  id: string;
  role: Role;
}

// Adds the optional `user` field to Express's Request type so handlers can read req.user.
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Authentication middleware.
 * Verifies the Bearer JWT and attaches { id, role } to req.user.
 * Identity and role always come from the signed token, never from the request body or query.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    // Throws if the signature is wrong or the token has expired.
    const payload = jwt.verify(header.slice(7), config.jwtSecret);

    // Reject tokens that are validly signed but do not carry the claims we expect.
    if (typeof payload === "string" || !payload.sub || (payload.role !== "DOCTOR" && payload.role !== "ADMIN")) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}