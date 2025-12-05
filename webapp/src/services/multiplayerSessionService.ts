import { API_BASE_URL, WS_BASE_URL } from "../config/runtime";

export type SessionState = "lobby" | "racing" | "finished" | "closed";

export interface Session {
  id: string;
  shelter_code: string;
  host_id: string;
  state: SessionState;
  max_players: number;
  expires_at: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string | null;
  ready: boolean;
  joined_at: string;
  last_seen: string;
}

export interface SessionResponse {
  session: Session;
  player: Player;
  token: string;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function buildSessionSocketUrl(sessionId: string, token: string) {
  const url = new URL(`/sessions/${sessionId}/stream`, WS_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export function createMultiplayerSession(payload: {
  shelterCode: string;
  hostId: string;
  displayName?: string;
  maxPlayers?: number;
  ttlMinutes?: number;
  hostLat?: number;
  hostLng?: number;
  maxDistanceKm?: number;
}) {
  return apiFetch<SessionResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function joinMultiplayerSession(payload: {
  shelterCode: string;
  userId: string;
  displayName?: string;
}) {
  return apiFetch<SessionResponse>("/sessions/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function toggleReadyState(sessionId: string, token: string, ready: boolean) {
  return apiFetch<{ player: Player }>(`/sessions/${sessionId}/ready`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ready }),
  });
}

export function startMultiplayerRace(sessionId: string, token: string) {
  return apiFetch<{ session: Session }>(`/sessions/${sessionId}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function finishMultiplayerRace(
  sessionId: string,
  token: string,
  payload?: { winnerUserId?: string; winnerDisplayName?: string },
) {
  return apiFetch<{ session: Session }>(`/sessions/${sessionId}/finish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
}

export function fetchSessionSnapshot(sessionId: string, token: string) {
  return apiFetch<{ session: Session; players: Player[] }>(`/sessions/${sessionId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function heartbeatSession(sessionId: string, token: string) {
  return apiFetch<void>(`/sessions/${sessionId}/heartbeat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export function leaveMultiplayerSession(sessionId: string, token: string) {
  return apiFetch<void>(`/sessions/${sessionId}/leave`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}
