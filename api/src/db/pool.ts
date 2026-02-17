import pg from "pg";
import { env, dbDefaults } from "../config.js";
import { logger } from "../logger.js";

const { Pool } = pg;
const databaseUrl = new URL(env.DATABASE_URL);
const sslMode = databaseUrl.searchParams.get("sslmode")?.toLowerCase();
const ssl = sslMode === "no-verify" ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl,
  connectionTimeoutMillis: dbDefaults.connectTimeoutMs,
  query_timeout: dbDefaults.queryTimeoutMs,
  statement_timeout: dbDefaults.statementTimeoutMs,
  max: 10,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on("error", (err: Error) => {
  logger.error({ err }, "Unexpected PG client error");
});
