import pg, { type PoolClient } from "pg";
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

const PUBLIC_SCHEMA_REFERENCE = /(?:"public"|public)\./gi;
const CLIENT_SCHEMA_PATCHED = Symbol("client-schema-patched");

export const quotePgIdentifier = (identifier: string): string => `"${identifier.replace(/"/g, "\"\"")}"`;

export const bindSchemaSql = (sqlText: string, schema = dbDefaults.schema): string =>
  sqlText.replace(PUBLIC_SCHEMA_REFERENCE, `${quotePgIdentifier(schema)}.`);

const bindQueryText = <T>(query: T): T => {
  if (typeof query === "string") {
    return bindSchemaSql(query) as T;
  }
  if (
    typeof query === "object" &&
    query !== null &&
    "text" in (query as Record<string, unknown>) &&
    typeof (query as { text?: unknown }).text === "string"
  ) {
    return {
      ...(query as Record<string, unknown>),
      text: bindSchemaSql((query as unknown as { text: string }).text),
    } as T;
  }
  return query;
};

export const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl,
  options: `-c search_path=${quotePgIdentifier(dbDefaults.schema)}`,
  connectionTimeoutMillis: dbDefaults.connectTimeoutMs,
  query_timeout: dbDefaults.queryTimeoutMs,
  statement_timeout: dbDefaults.statementTimeoutMs,
  max: 10,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

const patchClientQuery = (client: PoolClient) => {
  if ((client as unknown as Record<symbol, unknown>)[CLIENT_SCHEMA_PATCHED]) {
    return;
  }
  const originalClientQuery = client.query.bind(client);
  client.query = ((...queryArgs: unknown[]) => {
    const [queryTextOrConfig, values, callback] = queryArgs as [unknown, unknown, unknown];
    return (originalClientQuery as (...args: unknown[]) => unknown)(
      bindQueryText(queryTextOrConfig),
      values,
      callback,
    );
  }) as typeof client.query;
  (client as unknown as Record<symbol, unknown>)[CLIENT_SCHEMA_PATCHED] = true;
};

const originalPoolQuery = pool.query.bind(pool);
pool.query = ((...queryArgs: unknown[]) => {
  const [queryTextOrConfig, values, callback] = queryArgs as [unknown, unknown, unknown];
  return (originalPoolQuery as (...args: unknown[]) => unknown)(
    bindQueryText(queryTextOrConfig),
    values,
    callback,
  );
}) as typeof pool.query;

pool.on("connect", (client) => {
  patchClientQuery(client);
  void client
    .query(`set search_path to ${quotePgIdentifier(dbDefaults.schema)}`)
    .catch((err: Error) => {
      logger.error({ err }, "Failed to initialize database search_path");
    });
});

pool.on("error", (err: Error) => {
  logger.error({ err }, "Unexpected PG client error");
});
