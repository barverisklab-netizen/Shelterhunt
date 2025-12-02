import Fastify from "fastify";
import cors, { type FastifyCorsOptions } from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import fastifyJwt from "@fastify/jwt";
import type { FastifyRequest, FastifyReply } from "fastify";
import { env, corsOrigins } from "./config.js";
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

  const corsOriginOption: FastifyCorsOptions["origin"] =
    corsOrigins.length > 0
      ? (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"), false);
      }
      : true;

  fastify.register(cors, {
    origin: corsOriginOption,
    credentials: true,
  });

  fastify.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const text = typeof body === "string" ? body : body?.toString("utf8") ?? "";
    if (!text.trim()) {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(text);
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
  fastify.get("/", async (_request, reply) => {
    reply.type("text/html").send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>ShelterHunt API</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #111;
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .card {
            text-align: center;
            padding: 2rem 2.5rem;
            border: 1px solid #333;
            border-radius: 1rem;
            background: linear-gradient(135deg, #111, #1f1f1f);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          }
          h1 {
            margin: 0 0 0.5rem;
            font-size: 1.5rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          p {
            margin: 0;
            color: #a6a6a6;
          }
        </style>
      </head>
      <body>
        <section class="card">
          <h1>API Running</h1>
          <p>The ShelterHunt backend is online.</p>
        </section>
      </body>
      </html>
    `);
  });

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
