import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { sessionDefaults } from "../config.js";
import { ApiError } from "./errors.js";
import { PlayerRecord, SessionRecord } from "../types/session.js";
import type { ShelterRecord } from "../types/shelter.js";

const ACTIVE_STATES: SessionRecord["state"][] = ["lobby", "racing"];
const PLAYER_IDLE_TIMEOUT_MINUTES = 3;

const isUniqueViolation = (error: unknown): error is { code: string } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

async function closeInactiveSessionsForShelter(client: PoolClient, shelterId: string): Promise<string[]> {
  const result = await client.query<{ id: string }>(
    `update public.sessions s
     set state = 'closed'
     where s.shelter_id = $1
       and s.state = any($2)
       and not exists (
         select 1
         from public.players p
         where p.session_id = s.id
           and p.last_seen >= now() - interval '1 minute' * $3
       )
     returning s.id`,
    [shelterId, ACTIVE_STATES, PLAYER_IDLE_TIMEOUT_MINUTES],
  );
  return result.rows.map((row) => row.id);
}

async function fetchShelterByShareCode(client: PoolClient, code: string): Promise<ShelterRecord> {
  const normalized = normalizeCode(code);
  const result = await client.query<ShelterRecord>(
    `select id,
            code,
            share_code,
            external_id,
            sequence_no,
            name_en,
            name_jp,
            address,
            address_en,
            address_jp,
            category,
            category_jp,
            flood_depth_rank,
            flood_depth,
            storm_surge_depth_rank,
            storm_surge_depth,
            flood_duration_rank,
            flood_duration,
            inland_waters_depth_rank,
            inland_waters_depth,
            latitude,
            longitude,
            created_at
     from public.shelters
     where share_code = $1
     limit 1`,
    [normalized],
  );

  const shelter = result.rows[0];
  if (!shelter) {
    throw new ApiError(404, `Shelter code ${normalized} not found`);
  }
  return shelter;
}

interface CreateSessionInput {
  shelterCode: string;
  hostId: string;
  displayName?: string;
  maxPlayers?: number;
  ttlMinutes?: number;
  hostLat?: number;
  hostLng?: number;
  maxDistanceKm?: number;
}

interface JoinSessionInput {
  shelterCode: string;
  userId: string;
  displayName?: string;
}

export interface SessionWithPlayers {
  session: SessionRecord;
  players: PlayerRecord[];
}

async function findAvailableShelter(
  client: PoolClient,
  options?: {
    excludeShelterId?: string;
    center?: { lat: number; lng: number };
    maxDistanceKm?: number;
  },
): Promise<ShelterRecord | null> {
  const { excludeShelterId, center, maxDistanceKm } = options ?? {};

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const hav =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
    return R * c;
  };

  const limit = center && maxDistanceKm ? 200 : 50;

  const result = await client.query<ShelterRecord>(
    `select s.*
     from public.shelters s
     where not exists (
       select 1
       from public.sessions sess
       where sess.shelter_id = s.id
         and sess.state = any($1)
         and sess.expires_at > now()
     )
     ${excludeShelterId ? "and s.id <> $2" : ""}
     order by s.created_at asc
     limit ${limit}`,
    excludeShelterId ? [ACTIVE_STATES, excludeShelterId] : [ACTIVE_STATES],
  );

  const candidates = result.rows;

  if (center && maxDistanceKm && Number.isFinite(maxDistanceKm)) {
    const filtered = candidates.filter((shelter) => {
      if (!Number.isFinite(shelter.latitude) || !Number.isFinite(shelter.longitude)) {
        return false;
      }
      const distance = haversineKm(center, {
        lat: Number(shelter.latitude),
        lng: Number(shelter.longitude),
      });
      return distance <= maxDistanceKm;
    });
    return filtered[0] ?? null;
  }

  return candidates[0] ?? null;
}

export async function leaveSession(
  sessionId: string,
  userId: string,
): Promise<{
  session: SessionRecord;
  departedPlayer: PlayerRecord;
  promotedHostId: string | null;
}> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sessionResult = await client.query<SessionRecord>(
      "select * from public.sessions where id = $1 for update",
      [sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    const deleteResult = await client.query<PlayerRecord>(
      `delete from public.players
       where session_id = $1 and user_id = $2
       returning *`,
      [sessionId, userId],
    );
    const departed = deleteResult.rows[0];
    if (!departed) {
      throw new ApiError(404, "Player not found in session");
    }

    const remainingPlayers = await client.query<PlayerRecord>(
      `select * from public.players
       where session_id = $1
       order by joined_at asc`,
      [sessionId],
    );

    let promotedHostId: string | null = null;
    let updatedSession = session;

    if (session.host_id === userId) {
      const remainingCount = remainingPlayers.rowCount ?? 0;
      if (remainingCount > 0) {
        promotedHostId = remainingPlayers.rows[0].user_id;
        const updateResult = await client.query<SessionRecord>(
          `update public.sessions
           set host_id = $2
           where id = $1
           returning *`,
          [sessionId, promotedHostId],
        );
        updatedSession = updateResult.rows[0];
      } else {
        const closeResult = await client.query<SessionRecord>(
          `update public.sessions
           set state = 'closed',
               ended_at = coalesce(ended_at, now())
           where id = $1
           returning *`,
          [sessionId],
        );
        updatedSession = closeResult.rows[0];
      }
    }

    await client.query("COMMIT");
    return {
      session: updatedSession,
      departedPlayer: departed,
      promotedHostId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSession({
  shelterCode,
  hostId,
  displayName,
  maxPlayers = sessionDefaults.maxPlayers,
  ttlMinutes = sessionDefaults.ttlMinutes,
  hostLat,
  hostLng,
  maxDistanceKm,
}: CreateSessionInput): Promise<{ session: SessionRecord; player: PlayerRecord; releasedSessions: string[] }> {
  const distanceLimit =
    maxDistanceKm !== undefined && Number.isFinite(maxDistanceKm)
      ? maxDistanceKm
      : sessionDefaults.maxDistanceKm;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let shelter = await fetchShelterByShareCode(client, shelterCode);
    const releasedSessions = await closeInactiveSessionsForShelter(client, shelter.id);

    const hasActiveSession = async (shelterId: string) =>
      client.query<SessionRecord>(
        `select * from public.sessions
         where shelter_id = $1
           and state = any($2)
           and expires_at > now()
         limit 1`,
        [shelterId, ACTIVE_STATES],
      );

    let existing = await hasActiveSession(shelter.id);

    if (existing.rowCount) {
      const alternative = await findAvailableShelter(client, {
        excludeShelterId: shelter.id,
        center:
          hostLat !== undefined && hostLng !== undefined
            ? { lat: hostLat, lng: hostLng }
            : undefined,
        maxDistanceKm: distanceLimit,
      });
      if (alternative) {
        shelter = alternative;
        existing = await hasActiveSession(shelter.id);
      }
    }

    if (existing.rowCount) {
      throw new ApiError(409, "Shelter already in an active race");
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const sessionInsert = await client.query<SessionRecord>(
      `insert into public.sessions (shelter_id, shelter_code, host_id, max_players, expires_at)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [shelter.id, shelter.share_code, hostId, maxPlayers, expiresAt],
    );

    const session = sessionInsert.rows[0];

    const playerInsert = await client.query<PlayerRecord>(
      `insert into public.players (session_id, user_id, display_name, ready, last_seen)
       values ($1, $2, $3, $4, now())
       returning *`,
      [session.id, hostId, displayName ?? null, false],
    );

    await client.query("COMMIT");
    return { session, player: playerInsert.rows[0], releasedSessions };
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) {
      // Retry once with any other available shelter to keep host flow moving.
      await client.query("BEGIN");
      const fallbackShelter = await findAvailableShelter(client, {
        center:
          hostLat !== undefined && hostLng !== undefined
            ? { lat: hostLat, lng: hostLng }
            : undefined,
        maxDistanceKm: distanceLimit,
      });
      if (fallbackShelter) {
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        const sessionInsert = await client.query<SessionRecord>(
          `insert into public.sessions (shelter_id, shelter_code, host_id, max_players, expires_at)
           values ($1, $2, $3, $4, $5)
           returning *`,
          [fallbackShelter.id, fallbackShelter.share_code, hostId, maxPlayers, expiresAt],
        );

        const session = sessionInsert.rows[0];
        const playerInsert = await client.query<PlayerRecord>(
          `insert into public.players (session_id, user_id, display_name, ready, last_seen)
           values ($1, $2, $3, $4, now())
           returning *`,
          [session.id, hostId, displayName ?? null, false],
        );
        await client.query("COMMIT");
        return { session, player: playerInsert.rows[0], releasedSessions: [] };
      }
      await client.query("ROLLBACK");
      throw new ApiError(409, "Shelter already in an active race");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function joinSession({
  shelterCode,
  userId,
  displayName,
}: JoinSessionInput): Promise<{ session: SessionRecord; player: PlayerRecord }> {
  const normalizedCode = normalizeCode(shelterCode);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sessionQuery = await client.query<SessionRecord>(
      `select * from public.sessions
       where shelter_code = $1
         and state = any($2)
         and expires_at > now()
       limit 1`,
      [normalizedCode, ACTIVE_STATES],
    );

    const session = sessionQuery.rows[0];
    if (!session) {
      throw new ApiError(404, "Active session not found for shelter");
    }

    const playerCountQuery = await client.query<{ count: string }>(
      "select count(*) from public.players where session_id = $1",
      [session.id],
    );
    const playerCount = Number(playerCountQuery.rows[0].count);
    if (playerCount >= session.max_players) {
      throw new ApiError(409, "Session is full");
    }

    const playerInsert = await client.query<PlayerRecord>(
      `insert into public.players (session_id, user_id, display_name, ready, last_seen)
       values ($1, $2, $3, false, now())
       on conflict (session_id, user_id)
       do update set display_name = excluded.display_name, last_seen = now()
       returning *`,
      [session.id, userId, displayName ?? null],
    );

    await client.query("COMMIT");
    return { session, player: playerInsert.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function toggleReady(sessionId: string, userId: string, ready: boolean): Promise<PlayerRecord> {
  const result = await pool.query<PlayerRecord>(
    `update public.players
     set ready = $3,
         last_seen = now()
     where session_id = $1 and user_id = $2
     returning *`,
    [sessionId, userId, ready],
  );

  if (!result.rowCount) {
    throw new ApiError(404, "Player not found in session");
  }

  return result.rows[0];
}

export async function heartbeatPlayer(sessionId: string, userId: string): Promise<void> {
  const result = await pool.query<PlayerRecord>(
    `update public.players
     set last_seen = now()
     where session_id = $1 and user_id = $2`,
    [sessionId, userId],
  );
  if (!result.rowCount) {
    throw new ApiError(404, "Player not found in session");
  }
}

export async function startSession(sessionId: string, hostId: string): Promise<SessionRecord> {
  const result = await pool.query<SessionRecord>(
    `update public.sessions
     set state = 'racing',
         started_at = now(),
         expires_at = now() + interval '1 minute' * $3
     where id = $1 and host_id = $2 and state = 'lobby'
     returning *`,
    [sessionId, hostId, sessionDefaults.ttlMinutes],
  );

  if (!result.rowCount) {
    throw new ApiError(400, "Unable to start session (check host or state)");
  }

  return result.rows[0];
}

export async function finishSession(sessionId: string, hostId: string): Promise<SessionRecord> {
  const result = await pool.query<SessionRecord>(
    `update public.sessions
     set state = 'finished',
         ended_at = now()
     where id = $1
       and host_id = $2
       and state = 'racing'
     returning *`,
    [sessionId, hostId],
  );

  if (!result.rowCount) {
    throw new ApiError(400, "Unable to finish session");
  }

  return result.rows[0];
}

export async function getSessionWithPlayers(sessionId: string): Promise<SessionWithPlayers> {
  const [sessionResult, playersResult] = await Promise.all([
    pool.query<SessionRecord>("select * from public.sessions where id = $1", [sessionId]),
    pool.query<PlayerRecord>(
      `select * from public.players
       where session_id = $1
       order by joined_at asc`,
      [sessionId],
    ),
  ]);

  const session = sessionResult.rows[0];
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  return { session, players: playersResult.rows };
}

export async function expireStaleSessions(): Promise<string[]> {
  const result = await pool.query<{ id: string }>(
    `update public.sessions
     set state = 'closed'
     where state <> 'closed'
       and (
         expires_at < now()
         or not exists (
           select 1
           from public.players p
           where p.session_id = public.sessions.id
             and p.last_seen >= now() - interval '1 minute' * $1
         )
       )
     returning id`,
    [PLAYER_IDLE_TIMEOUT_MINUTES],
  );

  return result.rows.map((row) => row.id);
}
