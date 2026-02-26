import pg from "pg";
import { env, dbDefaults } from "../config.js";
import { logger } from "../logger.js";

const { Pool } = pg;
const LOCAL_DB_HOSTS = new Set(["", "localhost", "127.0.0.1", "::1"]);
const databaseUrl = new URL(env.DATABASE_URL);
const hostname = databaseUrl.hostname.toLowerCase();
const isLocalHost = LOCAL_DB_HOSTS.has(hostname);
const sslMode = databaseUrl.searchParams.get("sslmode")?.toLowerCase();
const sslFlag = databaseUrl.searchParams.get("ssl")?.toLowerCase();

if (sslMode === "no-verify") {
  logger.warn(
    "DATABASE_URL sslmode=no-verify is insecure and is ignored; enforcing certificate verification.",
  );
  databaseUrl.searchParams.delete("sslmode");
}

if (sslMode === "disable" && !isLocalHost) {
  logger.warn(
    "DATABASE_URL sslmode=disable is only allowed for local databases; enforcing TLS for non-local host.",
  );
  databaseUrl.searchParams.delete("sslmode");
}

if (sslMode && sslMode !== "disable") {
  databaseUrl.searchParams.delete("sslmode");
}

if (!isLocalHost && (sslFlag === "0" || sslFlag === "false")) {
  logger.warn(
    "DATABASE_URL ssl=0/false is insecure for non-local hosts and is ignored; enforcing TLS.",
  );
  databaseUrl.searchParams.delete("ssl");
}

const effectiveSslMode = databaseUrl.searchParams.get("sslmode")?.toLowerCase();
const wantsSslFromMode = Boolean(sslMode && sslMode !== "disable");
const wantsSslFromFlag = sslFlag === "1" || sslFlag === "true";
const shouldUseSsl =
  effectiveSslMode === "disable" ? false : !isLocalHost || wantsSslFromMode || wantsSslFromFlag;
if (shouldUseSsl) {
  databaseUrl.searchParams.delete("ssl");
}
if (shouldUseSsl && dbDefaults.sslAllowSelfSigned) {
  logger.warn(
    "DB_SSL_ALLOW_SELF_SIGNED=true: accepting self-signed DB certs. Use only for local development.",
  );
}
const ssl = shouldUseSsl
  ? { rejectUnauthorized: !dbDefaults.sslAllowSelfSigned }
  : undefined;

export const pool = new Pool({
  connectionString: databaseUrl.toString(),
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
