import "fastify";
import "@fastify/jwt";

export type SessionRole = "host" | "player";

export interface SessionTokenPayload {
  sessionId: string;
  playerId: string;
  userId: string;
  role: SessionRole;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: SessionTokenPayload;
    user: SessionTokenPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: import("fastify").RouteHandlerMethod;
  }
}
