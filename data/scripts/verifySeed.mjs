import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const parseArgs = (argv) => {
  const map = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    if (token.includes("=")) {
      const [key, value] = token.split("=");
      if (typeof value === "string") {
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

const argMap = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;
const schemaName = argMap.get("--schema") ?? process.env.DB_SCHEMA ?? "public";
const cityId = argMap.get("--city") ?? process.env.DEPLOYED_CITY_ID ?? process.env.CITY_ID;
if (!cityId) {
  console.error("[Verify] Missing city id. Provide --city or set DEPLOYED_CITY_ID/CITY_ID.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("[Verify] DATABASE_URL is required.");
  process.exit(1);
}

const quoteIdent = (value) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid identifier: ${value}`);
  }
  return `"${value}"`;
};

const schemaSql = quoteIdent(schemaName);
const cityConfigCandidates = [
  path.resolve(process.cwd(), "city-config", `${cityId}.json`),
  path.resolve(process.cwd(), "data", "city-config", `${cityId}.json`),
];

const resolveConfigPath = async () => {
  for (const candidate of cityConfigCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error(`City config not found for '${cityId}'. Checked: ${cityConfigCandidates.join(", ")}`);
};

async function main() {
  const configPath = await resolveConfigPath();
  const cityConfig = JSON.parse(await fs.readFile(configPath, "utf8"));
  const requiredAttributeIds = Array.isArray(cityConfig.questionCatalog)
    ? cityConfig.questionCatalog.map((item) => item.id)
    : [];
  if (!requiredAttributeIds.length) {
    throw new Error(`City config '${configPath}' has no questionCatalog entries.`);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`set search_path to ${schemaSql}`);

    const shelters = await client.query("select count(*)::int as count from shelters");
    const attributes = await client.query("select count(*)::int as count from question_attributes");
    const questionAnswerObjects = await client.query(
      "select count(*)::int as count from shelters where jsonb_typeof(question_answers) = 'object'",
    );

    const required = await client.query(
      "select id from question_attributes where id = any($1::text[])",
      [requiredAttributeIds],
    );
    const sheltersMissingQuestionKeys = await client.query(
      "select count(*)::int as count from shelters where not (question_answers ?& $1::text[])",
      [requiredAttributeIds],
    );

    const present = new Set(required.rows.map((row) => row.id));
    const missing = requiredAttributeIds.filter((id) => !present.has(id));

    console.log("[Verify] Schema:", schemaName);
    console.log("[Verify] City:", cityId);
    console.log("[Verify] shelters:", shelters.rows[0]?.count ?? 0);
    console.log("[Verify] question_attributes:", attributes.rows[0]?.count ?? 0);
    console.log("[Verify] shelters.question_answers objects:", questionAnswerObjects.rows[0]?.count ?? 0);

    if ((shelters.rows[0]?.count ?? 0) <= 0) {
      throw new Error("No shelters found after seed.");
    }

    if ((attributes.rows[0]?.count ?? 0) <= 0) {
      throw new Error("No question_attributes found after seed.");
    }

    if (missing.length) {
      throw new Error(`Missing required question attributes: ${missing.join(", ")}`);
    }

    if ((questionAnswerObjects.rows[0]?.count ?? 0) < (shelters.rows[0]?.count ?? 0)) {
      throw new Error("Some shelters do not contain JSONB question_answers objects.");
    }

    if ((sheltersMissingQuestionKeys.rows[0]?.count ?? 0) > 0) {
      throw new Error("Some shelters are missing required question_answers keys.");
    }

    console.log("[Verify] Seed verification passed.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[Verify] Seed verification failed:", error.message || error);
  process.exit(1);
});
