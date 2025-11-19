import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import fastifyJwt from "@fastify/jwt";
import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "./config.js";
import { logger, loggerConfig } from "./logger.js";
import sessionRoutes from "./routes/sessions.js";
import sheltersRoutes from "./routes/shelters.js";
import { SessionHub } from "./realtime/sessionHub.js";
import { ApiError } from "./services/errors.js";

export function buildServer() {
  const fastify = Fastify({
    logger: loggerConfig,
  });

  const sessionHub = new SessionHub();

  fastify.register(cors, {
    origin: true,
  });

  fastify.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    if (!body || body.trim() === "") {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (error) {
      done(error as Error);
    }
  });

  fastify.register(fastifyWebsocket);

  fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.send(error);
    }
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send({
        message: error.message,
        details: error.details,
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    reply.status(500).send({ message: "Internal server error" });
  });

  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.register(sheltersRoutes);
  fastify.register(sessionRoutes, { sessionHub });

  return fastify;
}

export async function start() {
  const server = buildServer();
  await server.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info({ port: env.PORT }, "API listening");
  return server;
}

if (process.env.NODE_ENV !== "test") {
  start().catch((error) => {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  });
}
