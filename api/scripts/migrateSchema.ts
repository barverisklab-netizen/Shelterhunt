import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const parseArgs = (argv: string[]) => {
  const map = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    if (token.includes("=")) {
      const [key, value] = token.split("=");
      if (value) {
        map.set(key, value);
      }
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      map.set(token, next);
      index += 1;
    }
  }
  return map;
};

const args = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;
const schemaName = (args.get("--schema") ?? process.env.DB_SCHEMA ?? "").trim();
const migrationsDir = path.resolve(args.get("--dir") ?? path.join(process.cwd(), "sql"));

const quoteIdent = (value: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid schema identifier: ${value}`);
  }
  return `"${value}"`;
};

const bindSchemaSql = (sqlText: string, schema: string) =>
  sqlText.replace(/(?:"public"|public)\./gi, `${quoteIdent(schema)}.`);

const sortedMigrationFiles = async (directory: string) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\d+.*\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
};

async function main() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }
  if (!schemaName) {
    throw new Error("DB_SCHEMA or --schema is required.");
  }

  const migrationFiles = await sortedMigrationFiles(migrationsDir);
  if (!migrationFiles.length) {
    throw new Error(`No migration files found in ${migrationsDir}`);
  }

  const schemaSql = quoteIdent(schemaName);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`create schema if not exists ${schemaSql}`);
    await client.query(`set search_path to ${schemaSql}, public`);

    for (const filename of migrationFiles) {
      const filePath = path.join(migrationsDir, filename);
      const rawSql = await fs.readFile(filePath, "utf8");
      const sql = bindSchemaSql(rawSql, schemaName);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`[migrate:schema] Applied ${filename} to schema '${schemaName}'`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
          `[migrate:schema] Failed on ${filename}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  } finally {
    await client.end();
  }

  console.log(`[migrate:schema] Completed ${migrationFiles.length} migration(s) for '${schemaName}'.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
