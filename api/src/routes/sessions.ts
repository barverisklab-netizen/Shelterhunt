import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createSession,
  expireStaleSessions,
  finishSession,
  getSessionWithPlayers,
  heartbeatPlayer,
  joinSession,
  leaveSession,
  startSession,
  toggleReady,
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

const streamQuerySchema = z.object({
  token: z.string().optional(),
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
      if (request.user.role !== "host") {
        throw new ApiError(403, "Only host can finish session");
      }

      const session = await finishSession(params.id, request.user.userId);

      sessionHub.broadcast(params.id, {
        type: "race_finished",
        payload: { endedAt: session.ended_at },
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

      const result = await leaveSession(params.id, request.user.userId);

      sessionHub.broadcast(params.id, {
        type: "player_left",
        payload: {
          user_id: request.user.userId,
          player_id: result.departedPlayer.id,
        },
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
      } catch (error) {
        socket.close(4403, "Invalid token");
      }
    },
  );

  fastify.post("/tasks/expire-sessions", async (request, reply) => {
    const cronKeyHeader = request.headers["x-cron-key"];
    const cronKey = Array.isArray(cronKeyHeader) ? cronKeyHeader[0] : cronKeyHeader;
    if (cronKey !== env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new ApiError(401, "Unauthorized cron request");
    }
    const closedSessions = await expireStaleSessions();
    closedSessions.forEach((sessionId) => sessionHub.close(sessionId));
    reply.send({ closed: closedSessions.length });
  });
};

export default sessionRoutes;
