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
import type { SessionHub } from "../realtime/sessionHub.js";
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
  fastify.post("/sessions", async (request, reply) => {
    const body = createSessionSchema.parse(request.body);
    const { session, player, releasedSessions } = await createSession(body);
    releasedSessions.forEach((sessionId) => sessionHub.close(sessionId));

    const token = fastify.jwt.sign(
      {
        sessionId: session.id,
        playerId: player.id,
        userId: body.hostId,
        role: "host" as SessionRole,
      },
      { expiresIn: TOKEN_TTL },
    );

    sessionHub.broadcast(session.id, {
      type: "session_created",
      payload: { session },
    });

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

    sessionHub.broadcast(session.id, {
      type: "player_joined",
      payload: { player },
    });

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

      sessionHub.broadcast(params.id, {
        type: "ready_updated",
        payload: { playerId: player.user_id, ready: player.ready },
      });

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
      if (request.user.role !== "host") {
        throw new ApiError(403, "Only host can start session");
      }

      const session = await startSession(params.id, request.user.userId);
      sessionHub.clearPlayerLocations(params.id);

      sessionHub.broadcast(params.id, {
        type: "race_started",
        payload: { startedAt: session.started_at },
      });

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

      sessionHub.broadcast(params.id, {
        type: "race_finished",
        payload: {
          endedAt: session.ended_at,
          winner: {
            user_id: winnerUserId,
            display_name: winnerDisplayName,
          },
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

      sessionHub.broadcast(params.id, {
        type: "player_left",
        payload: {
          user_id: request.user.userId,
          player_id: result.departedPlayer.id,
        },
      });
      sessionHub.removePlayerLocation(params.id, request.user.userId);
      sessionHub.broadcast(params.id, {
        type: "player_location_removed",
        payload: { user_id: request.user.userId },
      });

      if (result.promotedHostId) {
        sessionHub.broadcast(params.id, {
          type: "host_promoted",
          payload: { user_id: result.promotedHostId },
        });
      }

      if (result.session.state === "closed") {
        sessionHub.broadcast(params.id, {
          type: "session_closed",
          payload: {},
        });
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
          }),
        );

        const knownLocations = sessionHub.getPlayerLocations(params.id);
        if (knownLocations.length) {
          socket.send(
            JSON.stringify({
              type: "player_locations_snapshot",
              sessionId: params.id,
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
            const locationPayload = {
              user_id: payload.userId,
              lat: rounded.lat,
              lng: rounded.lng,
              updated_at: Date.now(),
            };
            sessionHub.upsertPlayerLocation(params.id, locationPayload);
            sessionHub.broadcast(params.id, {
              type: "player_location_updated",
              payload: locationPayload,
            });
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
    closedSessions.forEach((sessionId) => sessionHub.close(sessionId));
    reply.send({ closed: closedSessions.length });
  });
};

export default sessionRoutes;
