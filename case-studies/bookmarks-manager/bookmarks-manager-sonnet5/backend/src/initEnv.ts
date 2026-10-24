/**
 * @module initEnv
 *
 * Validates and parses `process.env` with zod at startup. The app must never
 * read `process.env` directly outside this module, every other file imports
 * the typed, validated `env` object exported here. Fails fast (throws) when a
 * required variable is missing or malformed, so misconfiguration is caught
 * before the HTTP server starts accepting traffic.
 */

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  SCRAPE_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  SCRAPE_MAX_BYTES: z.coerce.number().int().positive().default(2_000_000),
  SCRAPE_USER_AGENT: z.string().default("BookmarksManagerBot/1.0 (+https://example.com/bot)"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

/** Parsed, validated environment configuration shared across the app. */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates `process.env` against {@link envSchema}.
 *
 * @returns the typed environment configuration.
 * @throws {z.ZodError} when a required variable is missing or invalid.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. Check .env against .env.example.");
  }
  return result.data;
}

export const env = loadEnv();
