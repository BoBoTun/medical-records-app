import "dotenv/config";

/** Reads a mandatory env var and fails fast at startup instead of failing later at runtime. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Central place for all runtime configuration (values come from backend/.env). */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresInSeconds: 8 * 60 * 60, // 8 hours: one working shift
};