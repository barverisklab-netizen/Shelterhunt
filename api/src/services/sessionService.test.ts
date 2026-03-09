import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/shelterhunt_test";
process.env.DB_SCHEMA ??= "public";
process.env.DEPLOYED_CITY_ID ??= "koto";
process.env.TASKS_CRON_SECRET ??= "test-cron-secret-12345";
process.env.JWT_SECRET ??= "test-jwt-secret-12345";

type PoolModule = typeof import("../db/pool.js");
type ErrorsModule = typeof import("./errors.js");
type SessionServiceModule = typeof import("./sessionService.js");

let pool: PoolModule["pool"];
let ApiError: ErrorsModule["ApiError"];
let createSession: SessionServiceModule["createSession"];
let joinSession: SessionServiceModule["joinSession"];

type QueryResult<T = unknown> = {
  rows: T[];
  rowCount?: number;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim().toLowerCase();

const rows = <T>(value: T[]): QueryResult<T> => ({
  rows: value,
  rowCount: value.length,
});

const emptyResult = (): QueryResult => ({
  rows: [],
  rowCount: 0,
});

describe("sessionService race handling", () => {
  let originalConnect: unknown;

  beforeEach(async () => {
    if (!pool || !ApiError || !createSession || !joinSession) {
      const poolModule = await import("../db/pool.js");
      const errorsModule = await import("./errors.js");
      const sessionServiceModule = await import("./sessionService.js");
      pool = poolModule.pool;
      ApiError = errorsModule.ApiError;
      createSession = sessionServiceModule.createSession;
      joinSession = sessionServiceModule.joinSession;
    }
    originalConnect = (pool as { connect: unknown }).connect;
  });

  afterEach(() => {
    (pool as { connect: unknown }).connect = originalConnect;
  });

  it("allows only one successful join when two players race for the final slot", async () => {
    const session = {
      id: "session-1",
      shelter_id: "shelter-1",
      shelter_code: "ABCD",
      host_id: "host-user",
      state: "lobby",
      max_players: 2,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      started_at: null,
      ended_at: null,
      created_at: new Date().toISOString(),
    };

    const players = new Map<string, Record<string, unknown>>([
      [
        "host-user",
        {
          id: "player-host",
          session_id: session.id,
          user_id: "host-user",
          display_name: "Host",
          ready: false,
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        },
      ],
    ]);

    let clientSeq = 0;
    let lockOwner: number | null = null;
    const lockQueue: Array<() => void> = [];
    let selectUsesForUpdate = false;
    let countReads = 0;
    let insertCalls = 0;
    const bothCountsReached = deferred<void>();

    const acquireLock = async (clientId: number) => {
      if (lockOwner === null || lockOwner === clientId) {
        lockOwner = clientId;
        return;
      }
      await new Promise<void>((resolve) => {
        lockQueue.push(resolve);
      });
      lockOwner = clientId;
    };

    const releaseLock = (clientId: number) => {
      if (lockOwner !== clientId) return;
      lockOwner = null;
      const next = lockQueue.shift();
      if (next) next();
    };

    const makeClient = (clientId: number) => ({
      async query(sqlText: string, params: unknown[] = []): Promise<QueryResult> {
        const sql = normalizeSql(sqlText);

        if (sql === "begin") return emptyResult();
        if (sql === "commit" || sql === "rollback") {
          releaseLock(clientId);
          return emptyResult();
        }

        if (sql.includes("from public.sessions") && sql.includes("where shelter_code = $1")) {
          if (sql.includes("for update")) {
            selectUsesForUpdate = true;
            await acquireLock(clientId);
          }
          return rows([session]);
        }

        if (sql.includes("select count(*) from public.players")) {
          countReads += 1;
          if (countReads >= 2) {
            bothCountsReached.resolve();
          }
          return rows([{ count: String(players.size) }]);
        }

        if (sql.includes("insert into public.players")) {
          insertCalls += 1;
          if (!selectUsesForUpdate && insertCalls === 1) {
            await bothCountsReached.promise;
          }

          const [sessionId, userId, displayName] = params as [string, string, string | null];
          const existing = players.get(userId);
          if (existing) {
            const updated = { ...existing, display_name: displayName, last_seen: new Date().toISOString() };
            players.set(userId, updated);
            return rows([updated]);
          }

          if (players.size >= session.max_players) {
            const err = new Error("max players exceeded") as Error & { code?: string };
            err.code = "23514";
            throw err;
          }

          const player = {
            id: `player-${userId}`,
            session_id: sessionId,
            user_id: userId,
            display_name: displayName,
            ready: false,
            joined_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
          };
          players.set(userId, player);
          return rows([player]);
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
      release() {
        releaseLock(clientId);
      },
    });

    (pool as { connect: () => Promise<unknown> }).connect = async () => {
      clientSeq += 1;
      return makeClient(clientSeq);
    };

    const firstJoin = joinSession({
      shelterCode: "ABCD",
      userId: "user-a",
      displayName: "A",
    });
    const secondJoin = joinSession({
      shelterCode: "ABCD",
      userId: "user-b",
      displayName: "B",
    });

    const [firstResult, secondResult] = await Promise.allSettled([firstJoin, secondJoin]);
    const settled = [firstResult, secondResult];
    const successes = settled.filter((result) => result.status === "fulfilled");
    const failures = settled.filter((result) => result.status === "rejected");

    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.equal(players.size, 2);

    const failure = failures[0] as PromiseRejectedResult;
    assert.ok(failure.reason instanceof ApiError);
    assert.equal(failure.reason.statusCode, 409);
    assert.equal(failure.reason.message, "Session is full");
  });

  it("retries session creation with a fallback shelter when insert hits unique conflict", async () => {
    const primaryShelter = {
      id: "shelter-primary",
      share_code: "ABCD",
      latitude: 35.67,
      longitude: 139.8,
    };
    const fallbackShelter = {
      id: "shelter-fallback",
      share_code: "WXYZ",
      latitude: 35.68,
      longitude: 139.81,
    };

    let sessionInsertAttempts = 0;

    const client = {
      async query(sqlText: string, params: unknown[] = []): Promise<QueryResult> {
        const sql = normalizeSql(sqlText);

        if (sql === "begin" || sql === "commit" || sql === "rollback") {
          return emptyResult();
        }

        if (sql.includes("from public.shelters") && sql.includes("where share_code = $1")) {
          return rows([primaryShelter]);
        }

        if (sql.startsWith("update public.sessions s set state = 'closed'")) {
          return rows([]);
        }

        if (
          sql.includes("from public.sessions") &&
          sql.includes("where shelter_id = $1") &&
          sql.includes("state = any($2)")
        ) {
          return rows([]);
        }

        if (sql.startsWith("select s.* from public.shelters s where not exists")) {
          return rows([fallbackShelter]);
        }

        if (sql.startsWith("insert into public.sessions")) {
          sessionInsertAttempts += 1;
          if (sessionInsertAttempts === 1) {
            const err = new Error("duplicate key value violates unique constraint") as Error & {
              code?: string;
            };
            err.code = "23505";
            throw err;
          }
          return rows([
            {
              id: "session-fallback",
              shelter_id: fallbackShelter.id,
              shelter_code: fallbackShelter.share_code,
              host_id: "host-1",
              state: "lobby",
              max_players: 8,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              started_at: null,
              ended_at: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }

        if (sql.startsWith("insert into public.players")) {
          const [sessionId, userId, displayName] = params as [string, string, string | null];
          return rows([
            {
              id: "player-host",
              session_id: sessionId,
              user_id: userId,
              display_name: displayName,
              ready: false,
              joined_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
            },
          ]);
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
      release() {
        // no-op
      },
    };

    (pool as { connect: () => Promise<unknown> }).connect = async () => client;

    const result = await createSession({
      shelterCode: "ABCD",
      hostId: "host-1",
      displayName: "Host",
    });

    assert.equal(sessionInsertAttempts, 2);
    assert.equal(result.session.shelter_id, "shelter-fallback");
    assert.equal(result.session.shelter_code, "WXYZ");
    assert.equal(result.player.user_id, "host-1");
    assert.deepEqual(result.releasedSessions, []);
  });
});
