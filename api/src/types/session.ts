export type SessionState = "lobby" | "racing" | "finished" | "closed";

export interface SessionRecord {
  id: string;
  shelter_id: string;
  shelter_code: string;
  host_id: string;
  state: SessionState;
  max_players: number;
  expires_at: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface PlayerRecord {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string | null;
  ready: boolean;
  joined_at: string;
  last_seen: string;
}
