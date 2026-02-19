import type { WebSocket } from "ws";
import { logger } from "../logger.js";

export interface SessionEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface SessionPlayerLocation {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: number;
}

export class SessionHub {
  private rooms = new Map<string, Set<WebSocket>>();
  private playerLocations = new Map<string, Map<string, SessionPlayerLocation>>();

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
    this.playerLocations.delete(sessionId);
    logger.info({ sessionId }, "Closed session connections");
  }

  upsertPlayerLocation(sessionId: string, location: SessionPlayerLocation) {
    const roomLocations = this.playerLocations.get(sessionId) ?? new Map<string, SessionPlayerLocation>();
    roomLocations.set(location.user_id, location);
    this.playerLocations.set(sessionId, roomLocations);
  }

  removePlayerLocation(sessionId: string, userId: string) {
    const roomLocations = this.playerLocations.get(sessionId);
    if (!roomLocations) return;
    roomLocations.delete(userId);
    if (!roomLocations.size) {
      this.playerLocations.delete(sessionId);
    }
  }

  getPlayerLocations(sessionId: string): SessionPlayerLocation[] {
    const roomLocations = this.playerLocations.get(sessionId);
    if (!roomLocations) return [];
    return Array.from(roomLocations.values());
  }

  clearPlayerLocations(sessionId: string) {
    this.playerLocations.delete(sessionId);
  }
}
