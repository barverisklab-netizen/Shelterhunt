import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/shelterhunt_test";
process.env.DB_SCHEMA ??= "public";
process.env.DEPLOYED_CITY_ID ??= "test-city";
process.env.TASKS_CRON_SECRET ??= "test-cron-secret-12345";
process.env.JWT_SECRET ??= "test-jwt-secret-12345";

type QueryCapture = {
  sqlTexts: string[];
};

const captureSql = (queryTextOrConfig: unknown, target: QueryCapture) => {
  if (typeof queryTextOrConfig === "string") {
    target.sqlTexts.push(queryTextOrConfig);
    return;
  }
  if (
    typeof queryTextOrConfig === "object" &&
    queryTextOrConfig !== null &&
    "text" in (queryTextOrConfig as Record<string, unknown>) &&
    typeof (queryTextOrConfig as { text?: unknown }).text === "string"
  ) {
    target.sqlTexts.push((queryTextOrConfig as { text: string }).text);
  }
};

describe("config/schema binding", () => {
  it("fails env parsing when DB_SCHEMA or DEPLOYED_CITY_ID is missing", async () => {
    const { parseEnv } = await import("../config.js");
    const baseEnv: NodeJS.ProcessEnv = {
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/shelterhunt_test",
      DB_SCHEMA: "tenant_city",
      DEPLOYED_CITY_ID: "tokyo-23",
      TASKS_CRON_SECRET: "test-cron-secret-12345",
      JWT_SECRET: "test-jwt-secret-12345",
    };

    assert.throws(() => parseEnv({ ...baseEnv, DB_SCHEMA: undefined }), /DB_SCHEMA/);
    assert.throws(() => parseEnv({ ...baseEnv, DEPLOYED_CITY_ID: undefined }), /DEPLOYED_CITY_ID/);
  });

  it("rewrites hardcoded public schema references to the configured schema safely", async () => {
    const { bindSchemaSql, quotePgIdentifier } = await import("../db/pool.js");
    assert.equal(quotePgIdentifier('tenant"a'), '"tenant""a"');
    assert.equal(
      bindSchemaSql(
        `select * from public.shelters s join "public".sessions sess on sess.shelter_id = s.id`,
        "city_alpha",
      ),
      `select * from "city_alpha".shelters s join "city_alpha".sessions sess on sess.shelter_id = s.id`,
    );
  });

  it("keeps shelter/question attribute reads unqualified so search_path controls schema", async () => {
    const { pool } = await import("../db/pool.js");
    const { listShelters } = await import("./shelterService.js");
    const { listQuestionAttributes } = await import("./questionAttributeService.js");

    const capture: QueryCapture = { sqlTexts: [] };
    const originalQuery = pool.query;
    (pool as { query: unknown }).query = (async (queryTextOrConfig: unknown) => {
      captureSql(queryTextOrConfig, capture);
      return { rows: [], rowCount: 0 };
    }) as typeof pool.query;

    try {
      await listShelters();
      await listQuestionAttributes();
    } finally {
      (pool as { query: unknown }).query = originalQuery;
    }

    assert.equal(capture.sqlTexts.length, 2);
    assert.match(capture.sqlTexts[0], /\bfrom shelters\b/i);
    assert.match(capture.sqlTexts[1], /\bfrom question_attributes\b/i);
    assert.doesNotMatch(capture.sqlTexts[0], /\bpublic\./i);
    assert.doesNotMatch(capture.sqlTexts[1], /\bpublic\./i);
  });
});

describe("session stream ordering/idempotency helpers", () => {
  it("generates monotonic sequence numbers per session and resets on close", async () => {
    const { createSessionEventSequencer } = await import("../routes/sessions.js");
    const sequencer = createSessionEventSequencer();

    assert.equal(sequencer.next("session-a"), 1);
    assert.equal(sequencer.next("session-a"), 2);
    assert.equal(sequencer.next("session-b"), 1);
    sequencer.reset("session-a");
    assert.equal(sequencer.next("session-a"), 1);
  });

  it("suppresses exact duplicate rounded location updates", async () => {
    const { shouldSuppressDuplicateLocation } = await import("../routes/sessions.js");
    assert.equal(shouldSuppressDuplicateLocation(undefined, { lat: 35.1, lng: 139.1 }), false);
    assert.equal(
      shouldSuppressDuplicateLocation({ lat: 35.1, lng: 139.1 }, { lat: 35.1, lng: 139.1 }),
      true,
    );
    assert.equal(
      shouldSuppressDuplicateLocation({ lat: 35.1, lng: 139.1 }, { lat: 35.1001, lng: 139.1 }),
      false,
    );
  });
});
