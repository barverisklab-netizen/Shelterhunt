import type { WebSocket } from "ws";
import { logger } from "../logger.js";

export interface SessionEvent {
  type: string;
  payload: Record<string, unknown>;
}

export class SessionHub {
  private rooms = new Map<string, Set<WebSocket>>();

  subscribe(sessionId: string, socket: WebSocket) {
    const sockets = this.rooms.get(sessionId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.rooms.set(sessionId, sockets);

    socket.once("close", () => this.unsubscribe(sessionId, socket));
    socket.once("error", () => this.unsubscribe(sessionId, socket));
  }

  private unsubscribe(sessionId: string, socket: WebSocket) {
    const sockets = this.rooms.get(sessionId);
    if (!sockets) {
      return;
    }
    sockets.delete(socket);
    if (sockets.size === 0) {
      this.rooms.delete(sessionId);
    }
  }

  broadcast(sessionId: string, event: SessionEvent) {
    const sockets = this.rooms.get(sessionId);
    if (!sockets?.size) {
      return;
    }

    const payload = JSON.stringify({
      sessionId,
      timestamp: new Date().toISOString(),
      ...event,
    });

    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }

  close(sessionId: string) {
    const sockets = this.rooms.get(sessionId);
    if (!sockets) {
      return;
    }
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.close();
      }
    }
    this.rooms.delete(sessionId);
    logger.info({ sessionId }, "Closed session connections");
  }
}
