# Shelterhunt Multiplayer API

This service powers the multiplayer MVP described in the work plan. It exposes REST endpoints for creating/joining shelter sessions, toggling ready state, starting races, and provides a WebSocket channel for live lobby updates.

## Stack

- Fastify (HTTP + WebSocket)
- PostgreSQL (Supabase)
- `pg` for data access
- JWT for per-session auth

## Getting started

1. Copy `.env.example` to `.env` and fill in Supabase credentials plus a `JWT_SECRET`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. The server listens on `PORT` (default `4000`).

Environment variables of note:

- `SESSION_TTL_MINUTES` (default `20`)
- `SESSION_MAX_PLAYERS` (default `8`)
- `SESSION_MAX_DISTANCE_KM` (default `2`) — max km radius for auto-selected fallback shelters when the requested shelter is already in an active race

## Database schema

The SQL in `api/sql/001_init_sessions.sql` creates the required `sessions`/`players` tables and `session_state` enum (including a partial unique index so only one active race exists per shelter). Run it once against your Supabase project using their SQL editor or CLI:

```bash
psql "$DATABASE_URL" -f sql/001_init_sessions.sql
# or paste the file contents into Supabase SQL editor and run.
```

Make sure the `pgcrypto` extension is enabled so `gen_random_uuid()` is available (Supabase enables it by default).

After the tables exist, import the GeoJSON dataset:

```bash
cd api
SHELTER_DATA_PATH=../shelterhunt-data/geojson/ihi_shelters.geojson npm run seed:shelters
```

The GeoJSON is intentionally kept in a separate data repo (not deployed with the API). Point `SHELTER_DATA_PATH` to that file (or the local `../data/geojson/ihi_shelters.geojson`). The script generates deterministic shelter codes and upserts the records into Supabase. You can also seed from the data repo itself via `cd data && npm run seed:db` with the same `DATABASE_URL`.

## Key endpoints

| Method | Path                     | Description                               |
| ------ | ----------------------- | ----------------------------------------- |
| POST   | `/sessions`             | Host creates a new shelter session        |
| POST   | `/sessions/join`        | Join an existing session by shelter code  |
| POST   | `/sessions/:id/ready`   | Toggle ready state (auth required)        |
| POST   | `/sessions/:id/start`   | Host starts the race                      |
| GET    | `/sessions/:id`         | Fetch lobby snapshot (auth required)      |
| POST   | `/sessions/:id/finish`  | Mark race finished                        |
| POST   | `/tasks/expire-sessions`| Cron endpoint to close expired sessions   |

Subscribe to `ws://.../sessions/:id/stream?token=...` using the returned JWT token to receive lobby events (`player_joined`, `ready_updated`, etc.).

## Deployment (Render)

1. Create a Render Web Service, point to this `api` folder.
2. Set environment variables (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `SESSION_TTL_MINUTES`, `SESSION_MAX_PLAYERS`, `SESSION_MAX_DISTANCE_KM`).
3. Configure a deploy hook or Docker image (`render.yaml` optional) and ensure migrations are run (via Supabase SQL).
4. Optionally create a Render cron job hitting `/tasks/expire-sessions` with header `x-cron-key: <SUPABASE_SERVICE_ROLE_KEY>` for cleanup.

## Testing

Unit/integration test scaffolding can be added later. For now smoke-test with HTTP requests against a Supabase staging DB.
