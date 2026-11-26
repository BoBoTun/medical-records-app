import { PrismaClient } from "@prisma/client";

// One shared client for the whole process: Prisma manages the connection pool internally,
// so creating a client per request would exhaust database connections.
export const prisma = new PrismaClient();