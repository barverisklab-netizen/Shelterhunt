import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  JWT_SECRET: z.string().min(10),
  PORT: z.coerce.number().default(4000),
  SESSION_TTL_MINUTES: z.coerce.number().positive().default(20),
  SESSION_MAX_PLAYERS: z.coerce.number().min(2).default(8),
  SESSION_MAX_DISTANCE_KM: z.coerce.number().positive().default(2),
  CORS_ORIGIN: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  SESSION_TTL_MINUTES: process.env.SESSION_TTL_MINUTES,
  SESSION_MAX_PLAYERS: process.env.SESSION_MAX_PLAYERS,
  SESSION_MAX_DISTANCE_KM: process.env.SESSION_MAX_DISTANCE_KM,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});

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
