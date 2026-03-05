import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createSession,
  expireStaleSessions,
  finishSession,
  getSessionWithPlayers,
  heartbeatPlayer,
  isSessionRacing,
  joinSession,
  leaveSession,
  startSession,
  toggleReady,
  findPlayerByUserId,
} from "../services/sessionService.js";
import type { SessionHub, SessionPlayerLocation } from "../realtime/sessionHub.js";
import type { SessionRole, SessionTokenPayload } from "../types/fastify.js";

import { ApiError } from "../services/errors.js";
import { env } from "../config.js";

const createSessionSchema = z.object({
  shelterCode: z.string().min(3),
  hostId: z.string().min(1),
  displayName: z.string().min(1).max(80).optional(),
  maxPlayers: z.number().int().min(2).max(16).optional(),
  ttlMinutes: z.number().int().min(5).max(180).optional(),
  hostLat: z.number().optional(),
  hostLng: z.number().optional(),
  maxDistanceKm: z.number().optional(),
});

const joinSessionSchema = z.object({
  shelterCode: z.string().min(3),
  userId: z.string().min(1),
  displayName: z.string().min(1).max(80).optional(),
});

const readySchema = z.object({
  ready: z.boolean(),
});

const finishSchema = z
  .object({
    winnerUserId: z.string().uuid().optional(),
    winnerDisplayName: z.string().min(1).max(120).optional(),
  })
  .optional();

const streamQuerySchema = z.object({
  token: z.string().optional(),
});

const locationUpdateSchema = z.object({
  type: z.literal("location_update"),
  payload: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

const noCityQuerySchema = z
  .object({
    city: z.never().optional(),
    cityId: z.never().optional(),
    city_id: z.never().optional(),
  })
  .passthrough();

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function ensureSessionAccess(tokenSessionId: string, requestedId: string) {
  if (tokenSessionId !== requestedId) {
    throw new ApiError(403, "Token does not match session");
  }
}

const TOKEN_TTL = "3h";
const LOCATION_ROUNDING_METERS = 50;

interface SessionEventSequencer {
  next: (sessionId: string) => number;
  reset: (sessionId: string) => void;
}

export const createSessionEventSequencer = (): SessionEventSequencer => {
  const counters = new Map<string, number>();
  return {
    next: (sessionId: string) => {
      const value = (counters.get(sessionId) ?? 0) + 1;
      counters.set(sessionId, value);
      return value;
    },
    reset: (sessionId: string) => {
      counters.delete(sessionId);
    },
  };
};

export const shouldSuppressDuplicateLocation = (
  previous: Pick<SessionPlayerLocation, "lat" | "lng"> | undefined,
  next: Pick<SessionPlayerLocation, "lat" | "lng">,
): boolean => Boolean(previous && previous.lat === next.lat && previous.lng === next.lng);

const assertNoCityQueryOverride = (query: unknown) => {
  const parsed = noCityQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    throw new ApiError(400, "City is fixed by deployment and cannot be passed as a query parameter");
  }
};

const roundToNearestGrid = (lat: number, lng: number, meters = LOCATION_ROUNDING_METERS) => {
  const metersPerLatDegree = 111_320;
  const safeLatCos = Math.max(0.000001, Math.cos((lat * Math.PI) / 180));
  const metersPerLngDegree = metersPerLatDegree * safeLatCos;

  const latRounded = Math.round((lat * metersPerLatDegree) / meters) * (meters / metersPerLatDegree);
  const lngRounded = Math.round((lng * metersPerLngDegree) / meters) * (meters / metersPerLngDegree);

  return {
    lat: Number(latRounded.toFixed(6)),
    lng: Number(lngRounded.toFixed(6)),
  };
};

const sessionRoutes: FastifyPluginAsync<{ sessionHub: SessionHub }> = async (fastify, { sessionHub }) => {
  const eventSequencer = createSessionEventSequencer();
  const nextSequence = (sessionId: string) => eventSequencer.next(sessionId);
  const resetRealtimeState = (sessionId: string) => {
    eventSequencer.reset(sessionId);
  };

  const broadcastOrdered = (sessionId: string, type: string, payload: Record<string, unknown>) => {
    const event = {
      type,
      sequence: nextSequence(sessionId),
      payload,
    };
    sessionHub.broadcast(sessionId, event);
  };

  fastify.addHook("preHandler", async (request) => {
    assertNoCityQueryOverride(request.query);
  });

  fastify.post("/sessions", async (request, reply) => {
    const body = createSessionSchema.parse(request.body);
    const { session, player, releasedSessions } = await createSession(body);
    releasedSessions.forEach((sessionId) => {
      resetRealtimeState(sessionId);
      sessionHub.close(sessionId);
    });

    const token = fastify.jwt.sign(
      {
        sessionId: session.id,
        playerId: player.id,
        userId: body.hostId,
        role: "host" as SessionRole,
      },
      { expiresIn: TOKEN_TTL },
    );

    broadcastOrdered(session.id, "session_created", { session });

    reply.code(201).send({ session, player, token });
  });

  fastify.post("/sessions/join", async (request, reply) => {
    const body = joinSessionSchema.parse(request.body);
    const { session, player } = await joinSession(body);

    const token = fastify.jwt.sign(
      {
        sessionId: session.id,
        playerId: player.id,
        userId: body.userId,
        role: (session.host_id === body.userId ? "host" : "player") as SessionRole,
      },
      { expiresIn: TOKEN_TTL },
    );

    broadcastOrdered(session.id, "player_joined", { player });

    reply.send({ session, player, token });
  });

  fastify.post(
    "/sessions/:id/ready",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      ensureSessionAccess(request.user.sessionId, params.id);
      const body = readySchema.parse(request.body);
      const player = await toggleReady(params.id, request.user.userId, body.ready);

      broadcastOrdered(params.id, "ready_updated", { playerId: player.user_id, ready: player.ready });

      reply.send({ player });
    },
  );

  fastify.post(
    "/sessions/:id/heartbeat",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      ensureSessionAccess(request.user.sessionId, params.id);
      await heartbeatPlayer(params.id, request.user.userId);
      reply.code(204).send();
    },
  );

  fastify.post(
    "/sessions/:id/start",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      ensureSessionAccess(request.user.sessionId, params.id);

      const session = await startSession(params.id, request.user.userId);
      sessionHub.clearPlayerLocations(params.id);

      broadcastOrdered(params.id, "race_started", { startedAt: session.started_at });

      reply.send({ session });
    },
  );

  fastify.post(
    "/sessions/:id/finish",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      ensureSessionAccess(request.user.sessionId, params.id);

      const body = finishSchema.parse(request.body ?? {});
      const winnerUserId = body?.winnerUserId ?? request.user.userId;
      const winnerPlayer = await findPlayerByUserId(params.id, winnerUserId);
      if (!winnerPlayer) {
        throw new ApiError(403, "Winner not found in session");
      }

      const session = await finishSession(params.id, request.user.userId);
      const winnerDisplayName = body?.winnerDisplayName ?? winnerPlayer.display_name ?? null;

      broadcastOrdered(params.id, "race_finished", {
        endedAt: session.ended_at,
        winner: {
          user_id: winnerUserId,
          display_name: winnerDisplayName,
        },
      });

      reply.send({ session });
    },
  );

  fastify.post(
    "/sessions/:id/leave",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      ensureSessionAccess(request.user.sessionId, params.id);

      let result;
      try {
        result = await leaveSession(params.id, request.user.userId);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404 && /Player not found/.test(error.message)) {
          reply.code(204).send();
          return;
        }
        throw error;
      }

      broadcastOrdered(params.id, "player_left", {
        user_id: request.user.userId,
        player_id: result.departedPlayer.id,
      });
      sessionHub.removePlayerLocation(params.id, request.user.userId);
      broadcastOrdered(params.id, "player_location_removed", { user_id: request.user.userId });

      if (result.promotedHostId) {
        broadcastOrdered(params.id, "host_promoted", { user_id: result.promotedHostId });
      }

      if (result.session.state === "closed") {
        broadcastOrdered(params.id, "session_closed", {});
        resetRealtimeState(params.id);
        sessionHub.close(params.id);
      }

      reply.code(204).send();
    },
  );

  fastify.get(
    "/sessions/:id",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      ensureSessionAccess(request.user.sessionId, params.id);
      const data = await getSessionWithPlayers(params.id);
      reply.send(data);
    },
  );

  fastify.get(
    "/sessions/:id/stream",
    {
      websocket: true,
    },
    async (socket, request) => {
      const params = paramsSchema.parse(request.params);
      const query = streamQuerySchema.parse(request.query ?? {});
      const token = query.token ?? request.headers["sec-websocket-protocol"];

      if (typeof token !== "string") {
        socket.close(4401, "Missing token");
        return;
      }

      try {
        const payload = await fastify.jwt.verify<SessionTokenPayload>(token);
        ensureSessionAccess(payload.sessionId, params.id);
        sessionHub.subscribe(params.id, socket);
        socket.send(
          JSON.stringify({
            type: "connected",
            sessionId: params.id,
            playerId: payload.playerId,
            sequence: nextSequence(params.id),
            timestamp: new Date().toISOString(),
          }),
        );

        const knownLocations = sessionHub.getPlayerLocations(params.id);
        if (knownLocations.length) {
          socket.send(
            JSON.stringify({
              type: "player_locations_snapshot",
              sessionId: params.id,
              sequence: nextSequence(params.id),
              timestamp: new Date().toISOString(),
              payload: { locations: knownLocations },
            }),
          );
        }

        socket.on("message", async (rawMessage) => {
          const rawText =
            typeof rawMessage === "string"
              ? rawMessage
              : Buffer.isBuffer(rawMessage)
                ? rawMessage.toString("utf8")
                : Array.isArray(rawMessage)
                  ? Buffer.concat(rawMessage).toString("utf8")
                  : String(rawMessage);

          let parsed: unknown;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            return;
          }

          const parsedUpdate = locationUpdateSchema.safeParse(parsed);
          if (!parsedUpdate.success) {
            return;
          }

          const { lat, lng } = parsedUpdate.data.payload;
          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            Math.abs(lat) > 90 ||
            Math.abs(lng) > 180
          ) {
            return;
          }

          try {
            const racing = await isSessionRacing(params.id);
            if (!racing) {
              return;
            }

            const rounded = roundToNearestGrid(lat, lng);
            const previousLocation = sessionHub
              .getPlayerLocations(params.id)
              .find((location) => location.user_id === payload.userId);
            if (shouldSuppressDuplicateLocation(previousLocation, rounded)) {
              return;
            }

            const locationPayload = {
              user_id: payload.userId,
              lat: rounded.lat,
              lng: rounded.lng,
              updated_at: Date.now(),
            };
            sessionHub.upsertPlayerLocation(params.id, locationPayload);
            broadcastOrdered(params.id, "player_location_updated", locationPayload);
          } catch (error) {
            request.log.warn({ err: error }, "Failed to process location update");
          }
        });
      } catch (error) {
        socket.close(4403, "Invalid token");
      }
    },
  );

  fastify.post("/tasks/expire-sessions", async (request, reply) => {
    const cronKeyHeader = request.headers["x-cron-key"];
    const cronKey = Array.isArray(cronKeyHeader) ? cronKeyHeader[0] : cronKeyHeader;
    if (cronKey !== env.TASKS_CRON_SECRET) {
      throw new ApiError(401, "Unauthorized cron request");
    }
    const closedSessions = await expireStaleSessions();
    closedSessions.forEach((sessionId) => {
      resetRealtimeState(sessionId);
      sessionHub.close(sessionId);
    });
    reply.send({ closed: closedSessions.length });
  });
};

export default sessionRoutes;
