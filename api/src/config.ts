import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const configDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(configDir, "../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DB_SCHEMA: z
    .string()
    .trim()
    .min(1)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "DB_SCHEMA must be a valid PostgreSQL identifier"),
  DEPLOYED_CITY_ID: z.string().trim().min(1),
  TASKS_CRON_SECRET: z.string().min(10),
  JWT_SECRET: z.string().min(10),
  PORT: z.coerce.number().default(4000),
  DB_SSL_ALLOW_SELF_SIGNED: z.coerce.boolean().default(false),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  DB_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  SESSION_TTL_MINUTES: z.coerce.number().positive().default(20),
  SESSION_MAX_PLAYERS: z.coerce.number().min(2).default(8),
  SESSION_MAX_DISTANCE_KM: z.coerce.number().positive().default(2),
  CORS_ORIGIN: z.string().optional(),
});

export const parseEnv = (source: NodeJS.ProcessEnv) =>
  envSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
    DB_SCHEMA: source.DB_SCHEMA,
    DEPLOYED_CITY_ID: source.DEPLOYED_CITY_ID,
    TASKS_CRON_SECRET: source.TASKS_CRON_SECRET,
    JWT_SECRET: source.JWT_SECRET,
    PORT: source.PORT,
    DB_SSL_ALLOW_SELF_SIGNED: source.DB_SSL_ALLOW_SELF_SIGNED,
    DB_CONNECT_TIMEOUT_MS: source.DB_CONNECT_TIMEOUT_MS,
    DB_QUERY_TIMEOUT_MS: source.DB_QUERY_TIMEOUT_MS,
    DB_STATEMENT_TIMEOUT_MS: source.DB_STATEMENT_TIMEOUT_MS,
    SESSION_TTL_MINUTES: source.SESSION_TTL_MINUTES,
    SESSION_MAX_PLAYERS: source.SESSION_MAX_PLAYERS,
    SESSION_MAX_DISTANCE_KM: source.SESSION_MAX_DISTANCE_KM,
    CORS_ORIGIN: source.CORS_ORIGIN,
  });

export const env = parseEnv(process.env);

const parseOrigins = (raw?: string | null): string[] => {
  const values = raw
    ?.split(",")
    .map((value) => value.trim())
    .filter((value): value is string => value.length > 0);
  return values && values.length > 0 ? values : [];
};

export const corsOrigins = parseOrigins(env.CORS_ORIGIN);

export const sessionDefaults = {
  ttlMinutes: env.SESSION_TTL_MINUTES,
  maxPlayers: env.SESSION_MAX_PLAYERS,
  maxDistanceKm: env.SESSION_MAX_DISTANCE_KM,
};

export const dbDefaults = {
  schema: env.DB_SCHEMA,
  sslAllowSelfSigned: env.DB_SSL_ALLOW_SELF_SIGNED,
  connectTimeoutMs: env.DB_CONNECT_TIMEOUT_MS,
  queryTimeoutMs: env.DB_QUERY_TIMEOUT_MS,
  statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
};

export const deployedCityId = env.DEPLOYED_CITY_ID;
