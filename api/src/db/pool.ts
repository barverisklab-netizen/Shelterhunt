import pg from "pg";
import { env } from "../config.js";
import { logger } from "../logger.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err: Error) => {
  logger.error({ err }, "Unexpected PG client error");
});
