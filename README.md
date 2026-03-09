# Shelterhunt (Map n' Seek / マップれんぼ)

Shelterhunt is a map-based deduction game where players locate a target emergency shelter before time runs out.  
This repository contains the full stack:
- `webapp/`: React + Vite client with Mapbox gameplay UI.
- `api/`: Fastify backend for shelters, session lifecycle, and multiplayer streams.
- `data/`: GeoJSON dataset and import/export/rebuild scripts (not deployed).

## Contents
1. Repository Overview
2. Architecture at a Glance
3. Quick Start
4. Environment Setup
5. Scripts
6. API Contract
7. Database Model
8. Data Workflows (`data/` and seed scripts)
9. Runtime Flows
10. Troubleshooting

## Repository Overview

| Path | Purpose |
| --- | --- |
| `webapp/` | Browser game runtime, map UI, gameplay/session hooks, API client services |
| `api/` | Multiplayer/session backend, shelters/question-attributes API, WebSocket stream |
| `data/` | Source GeoJSON + scripts for export/import and 250m amenity recomputation |
| `.github/workflows/` | Release workflow |

## Architecture at a Glance

### Runtime dependencies
- `webapp` calls `api` for:
  - `GET /shelters`
  - `GET /question-attributes`
  - `/sessions/*` multiplayer endpoints
  - `GET /sessions/:id/stream` WebSocket
- `api` reads/writes PostgreSQL (Supabase-compatible):
  - `${DB_SCHEMA}.shelters`
  - `${DB_SCHEMA}.sessions`
  - `${DB_SCHEMA}.players`
  - `${DB_SCHEMA}.question_attributes`
- `data` scripts maintain source GeoJSON and can seed/export DB data.

### Frontend module boundaries (`webapp/src`)
- `components/`: screen-level and UI view components (`map/`, `controls/`, `layout/`, `ui/`, etc.).
- `features/`: extracted domain behavior by concern:
  - `session/`, `gameplay/`, `map/`, `measurement/`, `elevation/`.
- `services/`: API and map/query data access.
- `config/`: runtime/env configuration.

Current complexity hotspots:
- `components/GameScreen.tsx`
- `components/map/MapView.tsx`

### Main Screens & Interactions
- `webapp/src/components/IntroScreen.tsx`: initial landing experience before mode selection and onboarding.
- `webapp/src/components/OnboardingScreen.tsx`: setup flow for player identity and mode selection (solo, host, join), with help and localization-aware copy.
- `webapp/src/components/WaitingRoom.tsx`: multiplayer lobby with roster, ready-state controls, share flow, and host-managed race start.
- `webapp/src/components/GameScreen.tsx`: central gameplay orchestrator. It coordinates map interactions, clue/question state, solve attempts, panel routing, and end-of-round outcomes.
- `webapp/src/components/SoloModeScreen.tsx`: solo-specific launch path into gameplay with local state ownership.
- `webapp/src/components/TerminalScreen.tsx`: post-round terminal state surface used when gameplay transitions out of active mode.
- `webapp/src/components/overlays/*`: dedicated overlays for help, profile naming, tutorial carousel, host share, guess confirmation, victory, and penalty messaging.
- Background resume behavior: `webapp/src/App.tsx` persists session/gameplay snapshots into `localStorage`; on tab return/visibility restore it reconciles state, refreshes session data, and re-establishes multiplayer heartbeat/socket behavior when applicable.

### Core Interaction Modules
- `webapp/src/components/map/MapView.tsx`: Mapbox lifecycle wrapper and interaction hub. It integrates city layers, player/other-player location rendering, measurement hooks, and elevation sampling hooks while preserving gameplay state ownership in `GameScreen`.
- `webapp/src/components/map/MapLayerPanel.tsx`: layer toggle UI for city layers; visibility changes are driven through extracted map feature hooks and applied to the active map instance.
- `webapp/src/components/map/MeasurePanel.tsx`: measurement interaction readout that reports radius results and visible-layer counts for the selected point.
- `webapp/src/components/panels/QuestionDrawer.tsx`: question prompt workflow, answer input controls, eligibility gating, and cooldown presentation. It supports proximity-aware categories and per-question lock timing.
- `webapp/src/components/panels/GameplayPanel.tsx`: mission-control style panel for clue history, wrong-clue context, and player strategy support during active rounds.
- Dynamic clue/question system: question templates are API-driven from `question_attributes`; clue text and prompts are localized via `webapp/src/assets/locales/*.json` and resolved at runtime.
- Proximity and nearby checks: gameplay uses configured radius gates and nearby feature checks before unlocking selected question categories; this behavior is controlled by runtime flags in `webapp/src/config/runtime.ts`.
- Multiplayer live map behavior: player positions sync through the session stream (`/sessions/:id/stream`) and are rendered as map updates; server-side 50m coordinate rounding affects perceived movement granularity.

### Layer Styling and Data Sources (Important)
- Layer styling and behavior metadata are city-owned in `webapp/src/cityContext/<city>/layers.ts` (filters, paint/layout, popup templates, grouping, default visibility).
- Layer source paths for local datasets are defined in `webapp/src/data/kotoGeojsonSources.ts` and point to bundled GeoJSON files in `data/geojson/<city>/*`.
- Layer runtime loading is handled by `webapp/src/features/map/layers/useCityLayers.ts`:
  - `sourceType: "geojson"` layers are loaded from local GeoJSON URLs (`map.addSource(... type: "geojson")`).
  - `sourceType: "vector"` layers are loaded from Mapbox tilesets using `mapbox://{username}.{layerId}` from `webapp/src/config/mapbox.ts`.
- Current split in `koto/layers.ts` is mixed:
  - shelter/support/landmark point layers are local GeoJSON-backed.
  - Hazard layers (flood depth, inland water depth, flood duration, storm surge) are Mapbox vector tileset-backed.
- Basemap is Mapbox style-driven (`webapp/src/data/cityContext.ts`, `basemapUrl`).

Related data-source behavior:
- Proximity index (`webapp/src/services/proximityIndex.ts`) uses local raw GeoJSON imports (`data/geojson/<city>/*`).
- Measurement feature counting (`webapp/src/features/measurement/services/measurementLayers.ts`) currently evaluates only GeoJSON-backed layers; vector hazard layers are not part of measurement feature extraction.
- Lightning/multiplayer shelter selection in current app flow uses local/API shelter data (`getLocalShelters`/`getShelters`), not the Mapbox tilequery utilities. Tilequery helpers exist in `webapp/src/utils/lightningSelection.ts` and `webapp/src/services/designatedShelterService.ts` but are not the active path in `App.tsx`.

## Quick Start

### Prerequisites
- Node.js 20+ recommended
- npm 10+ recommended
- Postgres/Supabase database for `api`
- Mapbox token for `webapp`

### Install
```bash
npm install
npm --prefix webapp install
npm --prefix api install
npm --prefix data install
```

### Run webapp only
```bash
npm run dev:webapp
```

### Run API only
```bash
npm run dev:api
```

### Run full stack (webapp + api)
```bash
npm run dev
```

### Build
```bash
npm run build:webapp
npm run build:api
```

### Local Sensor Testing (Geolocation)
Lightning and multiplayer flows are location-sensitive during local testing:
- Lightning mode uses the player location to fetch/select shelters around the player.
- Multiplayer uses location checks and live location updates during race state.

Recommended setup:
- On desktop, test from `http://localhost` (geolocation is allowed on localhost).
- For LAN/mobile testing on another device, use `https` (browsers typically block geolocation on non-secure origins).
- In Chrome DevTools, use `More tools -> Sensors` to simulate GPS coordinates.
- On physical devices, enable OS location services and browser location permission.

Related flag:
- `VITE_ENABLE_PROXIMITY=false` bypasses proximity gating for questions, but does not replace geolocation behavior needed for lightning/multiplayer location testing.

## Environment Setup

Create local env files:
```bash
cp webapp/.env.example webapp/.env.local
cp api/.env.example api/.env
cp data/.env.example data/.env
```

Never commit real secrets.

### Webapp env (`webapp/.env.local`)

Required for local map runtime:
- `VITE_DEPLOYED_CITY_ID` (deployment-bound city, e.g. `koto`)
- `VITE_MAPBOX_TOKEN`
- `VITE_MAPBOX_USERNAME` (required when vector layers are used)

Common:
- `VITE_API_BASE_URL` (default `http://localhost:4000`)
- `VITE_WS_BASE_URL` (optional; defaults from API URL with `ws` scheme)
- `VITE_MAPBOX_STYLE_URL` (optional)
- `VITE_SUPPORTED_LOCALES` (optional comma-separated subset of city-supported locales, e.g. `en,ja`)
- `VITE_DEFAULT_LOCALE` (`en` / `ja`)

Gameplay toggles:
- `VITE_ENABLE_PROXIMITY` (default `true`)
- `VITE_PROXIMITY_RADIUS_KM` (default `0.25`)
- `VITE_ENABLE_WRONG_GUESS_PENALTY` (default `false`)
- `VITE_ONE_QUESTION_PER_LOCATION` (default `false`)
- `VITE_MULTIPLAYER_RADIUS_KM` (default `2`)
- `VITE_LIGHTNING_MINUTES` (default `60`)
- `VITE_LIGHTNING_RADIUS_KM` (default `2`)

Note: `webapp/.env.example` currently includes `VITE_LIGHTNING_DURATION_MINUTES`; runtime code reads `VITE_LIGHTNING_MINUTES`.

### API env (`api/.env`)

Required:
- `DATABASE_URL`
- `DB_SCHEMA` (deployment-bound schema, e.g. `public`, `osaka`)
- `DEPLOYED_CITY_ID` (deployment-bound city id)
- `JWT_SECRET`
- `TASKS_CRON_SECRET`

Common:
- `PORT` (default `4000`)
- `SESSION_TTL_MINUTES` (default `20`)
- `SESSION_MAX_PLAYERS` (default `8`)
- `SESSION_MAX_DISTANCE_KM` (default `2`)
- `CORS_ORIGIN` (comma-separated allowed origins)

DB safety/timeouts:
- `DB_SSL_ALLOW_SELF_SIGNED` (default `false`)
- `DB_CONNECT_TIMEOUT_MS` (default `5000`)
- `DB_QUERY_TIMEOUT_MS` (default `10000`)
- `DB_STATEMENT_TIMEOUT_MS` (default `10000`)

### Alternate Database Options (Beyond Supabase)
Current deployment uses Supabase, but the backend is written against standard PostgreSQL (`pg` driver).  
Any PostgreSQL-compatible provider can be used with minimal/no code changes.

Short answer:
- PostgreSQL-compatible switch: no API code changes required, but environment variables must be updated.
- Update at minimum:
  - `api/.env`: `DATABASE_URL` (and `CORS_ORIGIN` if frontend host changes)
  - `data/.env`: `DATABASE_URL` when running `data` import/export scripts

Works with no code changes:
- Local PostgreSQL
- Neon Postgres
- Render Postgres
- Railway Postgres
- AWS RDS Postgres

What you must do when switching provider:
1. Set `DATABASE_URL` for the target provider in `api/.env`.
2. Run SQL setup:
   - `api/sql/001_init_sessions.sql`
   - `api/sql/002_question_attributes.sql`
3. Seed data (recommended):
   - `cd api && SHELTER_DATA_PATH=../data/geojson/koto/shelters.geojson npm run seed:shelters`
4. Update `CORS_ORIGIN` for your frontend domain(s).
5. Ensure a scheduler/cron can call `POST /tasks/expire-sessions` with `x-cron-key`.

Postgres-specific requirements:
- `pgcrypto` extension is used (`gen_random_uuid()` in schema).
- Enum type `session_state` is required.
- Partial unique index on active sessions is required.
- JSONB column support is used (`question_attributes.options`, `shelters.question_answers`).

TLS / connection notes:
- Hosted DBs should use verified TLS (`sslmode=require`).
- `sslmode=disable` is only valid for localhost/loopback DBs.
- `sslmode=no-verify` is intentionally rejected.

If you want a non-PostgreSQL engine (MySQL, SQLite, MongoDB), code changes are required:
- Replace `pg` pool and SQL query layer in `api/src/db/pool.ts` and `api/src/services/*`.
- Recreate migrations/types/constraints in the new datastore.
- Rework Postgres-specific SQL features (enum, partial index, JSONB, `gen_random_uuid()`).

### Data env (`data/.env`)
- `DATABASE_URL` (for `seed:db`)
- `DB_SCHEMA` (schema used by `seed:db`/`verify:seed`)
- `DEPLOYED_CITY_ID` (city used for `data/geojson/<city>/...` defaults)
- `SHELTER_DATA_PATH` (GeoJSON path override)
- `DATA_API_BASE_URL` (for `export:api`)
- `OUTPUT_PATH` (export destination path)

## Scripts

### Root scripts
| Command | Purpose |
| --- | --- |
| `npm run scaffold:city -- --city=<id> --name="City Name"` | Generate city boilerplate (`cityContext` files + data placeholders + registry wiring) |
| `npm run migrate:api-schema -- --schema=<schema>` | Apply API SQL migrations to a target city schema |
| `npm run seed:api-shelters -- --city=<id> --schema=<schema>` | Seed shelters + question attributes for a target city/schema |
| `npm run dev:webapp` | Start Vite client |
| `npm run dev:api` | Start Fastify API |
| `npm run dev` | Run both in parallel |
| `npm run build:webapp` | Build webapp |
| `npm run build:api` | Build API |
| `npm run start:api` | Run built API |

## Minimum Requirements to Add a City

1. Scaffold city boilerplate.
   ```bash
   npm run scaffold:city -- --city=<id> --name="City Name" --lat=<centerLat> --lng=<centerLng>
   ```
2. Add city datasets in `data/geojson/<id>/`:
   - `shelters.geojson`
   - `support.geojson`
   - `landmark.geojson`
3. Fill city modules:
   - `webapp/src/cityContext/<id>/context.ts`
   - `webapp/src/cityContext/<id>/layers.ts`
   - `webapp/src/cityContext/<id>/questionAdapter.ts`
   - `data/city-config/<id>.json` (questionCatalog + poiTypes + nearby mode/matchers)
   - include applicable locales in `layers.ts` via `<city>SupportedLocales`
4. Create/upgrade target schema.
   ```bash
   npm run migrate:api-schema -- --schema=<schema>
   ```
5. Seed shelters + question attributes for that city/schema.
   ```bash
   npm run seed:api-shelters -- --city=<id> --schema=<schema>
   ```
6. Verify seed integrity.
   ```bash
   npm --prefix data run verify:seed -- --city=<id> --schema=<schema>
   ```
7. Set deployment env:
   - Webapp: `VITE_DEPLOYED_CITY_ID=<id>`, `VITE_MAPBOX_TOKEN`, `VITE_MAPBOX_USERNAME` (if vector layers)
   - API: `DEPLOYED_CITY_ID=<id>`, `DB_SCHEMA=<schema>`, `DATABASE_URL`, `JWT_SECRET`, `TASKS_CRON_SECRET`
8. Run smoke checks:
   - `GET /health` is `200`
   - `/shelters` is non-empty
   - `/question-attributes` is non-empty
   - map loads and layer toggle works
   - session stream connects (`/sessions/:id/stream`)

### API scripts (`api/package.json`)
| Command | Purpose |
| --- | --- |
| `npm run dev` | Run API in watch mode (`tsx`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled server |
| `npm run lint` | Lint API TypeScript |
| `npm run check` | Type check API |
| `npm run migrate:schema -- --schema=<schema>` | Apply `api/sql/*.sql` to target schema |
| `npm run seed:shelters -- --city=<id> --schema=<schema>` | Seed shelters + question attributes from city GeoJSON |

### Data scripts (`data/package.json`)
| Command | Purpose |
| --- | --- |
| `npm run export:api` | Pull shelters from API and write GeoJSON |
| `npm run seed:db` | Upsert shelters + `question_attributes` + `question_answers` into configured schema |
| `npm run build:answers` | Recompute `250m_*` fields from raw map layers |
| `npm run verify:seed` | Verify shelters + `question_attributes` completeness post-seed |

## Release Gates (Per-City Deployment)

Required env contract for a deployment:
- Frontend: `VITE_DEPLOYED_CITY_ID`, `VITE_MAPBOX_TOKEN`, `VITE_MAPBOX_USERNAME`
- API: `DEPLOYED_CITY_ID`, `DB_SCHEMA`, `DATABASE_URL`, `JWT_SECRET`, `TASKS_CRON_SECRET`

Minimum smoke checks before traffic cutover:
1. `GET /health` returns `200`.
2. `GET /shelters` returns non-empty `shelters`.
3. `GET /question-attributes` returns non-empty `attributes`.
4. Webapp loads map style and can toggle at least one city layer.
5. Session stream connects on `/sessions/:id/stream`.

Rollback baseline:
1. Re-deploy previous frontend/API artifact pair (same manifest version).
2. Keep DB schema unchanged; if seed/migration changed data, restore DB snapshot for the target schema.
3. Re-run smoke checks above.

## API Contract

### Read endpoints
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/shelters` | Returns shelter dataset used by map/gameplay |
| `GET` | `/shelters/:code` | Returns one shelter by share code |
| `GET` | `/question-attributes` | Returns dynamic question metadata |

### Session endpoints
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/sessions` | Host creates session |
| `POST` | `/sessions/join` | Player joins session by shelter code |
| `POST` | `/sessions/:id/ready` | Toggle ready (JWT required) |
| `POST` | `/sessions/:id/heartbeat` | Presence update (JWT required, returns 204) |
| `POST` | `/sessions/:id/start` | Host starts race |
| `POST` | `/sessions/:id/finish` | Finish race and winner |
| `POST` | `/sessions/:id/leave` | Leave session, host may be promoted |
| `GET` | `/sessions/:id` | Session + players snapshot |
| `GET` | `/sessions/:id/stream` | WebSocket stream (token required) |
| `POST` | `/tasks/expire-sessions` | Cron cleanup (`x-cron-key`) |

City binding rule:
- API is deployment-bound to one city/schema (`DEPLOYED_CITY_ID`, `DB_SCHEMA`).
- Gameplay routes reject `city`, `cityId`, and `city_id` query overrides.

### WebSocket event notes
- Lobby events: `player_joined`, `ready_updated`, `race_started`, `race_finished`, etc.
- Location updates are accepted only while `session.state === racing`.
- Location coordinates are rounded to 50m grid before broadcast.
- Live location cache is in memory (`SessionHub`), not persisted in DB.

## Database Model

Migrations:
- `api/sql/001_init_sessions.sql`
- `api/sql/002_question_attributes.sql`

Schema strategy:
- One deployment serves one city.
- API is schema-bound at startup via `DB_SCHEMA`.
- Existing city can remain in `public`; new cities should use dedicated schemas.

### `${DB_SCHEMA}.shelters`
Purpose:
- Master shelter catalog for gameplay and session targeting.

Key columns:
- identity: `id`, `code` (unique), `share_code` (unique)
- location: `latitude`, `longitude`
- hazard + clue attributes: flood/storm/inland fields, `facility_type`, `shelter_capacity`, `*_250m`
- canonical dynamic answers: `question_answers` (JSONB keyed by question id)

Used by:
- API: `GET /shelters`, `GET /shelters/:code`
- Session service: shelter lookup and active-session targeting
- Webapp: base shelter dataset for map + gameplay

### `${DB_SCHEMA}.sessions`
Purpose:
- Session lifecycle per multiplayer race.

Key columns:
- `id`, `shelter_id`, `shelter_code`, `host_id`
- `state` (`lobby|racing|finished|closed`)
- `max_players`, `expires_at`, `started_at`, `ended_at`

Critical constraint:
- Partial unique index ensures one active (`lobby`/`racing`) session per shelter.

State semantics:
- `lobby`: players join/ready before host starts.
- `racing`: active multiplayer round; live location updates are accepted.
- `finished`: race completed.
- `closed`: expired/ended session cleanup state.

### `${DB_SCHEMA}.players`
Purpose:
- Player membership + presence in session.

Key columns:
- `session_id`, `user_id`, `display_name`, `ready`, `last_seen`

Critical constraint:
- unique `(session_id, user_id)`.

Presence behavior:
- `last_seen` is updated by heartbeat and ready toggles.
- Expiry task uses `last_seen` to close abandoned sessions.

### `${DB_SCHEMA}.question_attributes`
Purpose:
- Dynamic question metadata for frontend prompts.

Key columns:
- `id`, `label`, `kind` (`number`/`select`), `options` (jsonb)

Model detail:
- `id`: stable key consumed by frontend dynamic question templates (e.g. `floodDepth`, `facilityType`, `shelterCapacity`).
- `label`: human-readable question label.
- `kind`:
  - `number`: numeric comparison/input style question.
  - `select`: categorical question with predefined options.
- `options`:
  - Required for `select` style attributes.
  - Usually empty array for `number` attributes.
  - Stored as JSONB array in DB.

How this table is populated:
- Created by `api/sql/002_question_attributes.sql`.
- Seeded/updated by `api/scripts/importShelters.ts` (`npm run seed:shelters`).
- Seeder builds this table from `data/city-config/<city>.json -> questionCatalog`.
- For `select` questions, options are derived from observed dataset values.
- Upsert behavior keeps `id` stable while refreshing labels/kinds/options.

Runtime usage:
- API returns rows via `GET /question-attributes`.
- Webapp fetches/caches via `webapp/src/services/questionAttributeService.ts`.
- `GameScreen`/question drawer uses these records to construct dynamic question set and input controls.

Operational note:
- If `${DB_SCHEMA}.question_attributes` is empty/missing, dynamic question generation in the UI becomes incomplete.

## Data Workflows (`data/` and Seed Scripts)

### Preferred production-like seed path
1. Apply SQL migrations to the target city schema.
   ```bash
   npm run migrate:api-schema -- --schema=koto
   ```
2. Run:
   ```bash
   npm run seed:api-shelters -- --city=koto --schema=koto
   ```
3. Seeder upserts:
   - `${DB_SCHEMA}.shelters`
   - `${DB_SCHEMA}.question_attributes`

### Direct DB seed path
```bash
cd data
npm run seed:db
```
`seed:db` now uses the same city-config contract to upsert:
- `${DB_SCHEMA}.shelters` (including JSONB `question_answers`)
- `${DB_SCHEMA}.question_attributes`

### Export current DB/API shelters back to GeoJSON
```bash
cd data
npm run export:api
```

### Recompute `250m_*` amenity fields
```bash
cd data
npm run build:answers -- --city=koto
```

## Runtime Flows

### Gameplay boot flow
1. Webapp loads and fetches `/shelters`.
2. Webapp fetches `/question-attributes`.
3. UI initializes clues, filters, and map layers from these payloads.

### Multiplayer flow
1. Host creates session (`POST /sessions`) or player joins (`POST /sessions/join`).
2. Client receives JWT and connects to `/sessions/:id/stream`.
3. Ready/start/finish/leave events propagate through REST + WS broadcasts.
4. Heartbeats update `players.last_seen`; cron can close stale sessions.

## Troubleshooting

### DB-backed endpoints fail while `/health` is up
Cause:
- Supabase/Postgres paused or unavailable.

Action:
- Resume/wake database and retry.

### Session auth errors (`401`/`403`)
Cause:
- Missing/expired token or token/session mismatch.

Action:
- Rejoin/create session and refresh token; ensure client session ID matches token session ID.

### Live location markers not updating
Checklist:
- Session state must be `racing`.
- Client must send `location_update`.
- Movement under 50m may look unchanged due to server rounding.
- API restart clears in-memory location cache until fresh updates arrive.

### Layer/proximity/gameplay anomalies after refactor
Action:
- Run targeted checks around `GameScreen.tsx`, `MapView.tsx`, and feature hooks in `webapp/src/features/*`.

## CI Note

`release.yml` currently runs `npm run build` at repo root, but root `package.json` exposes `build:webapp` and `build:api` (not `build`).  
Align workflow and scripts before relying on release automation.
