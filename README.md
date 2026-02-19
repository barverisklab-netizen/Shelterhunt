# Map n' Seek (マップれんぼ) · Location-Based Deduction Game

This repository contains the Map n' Seek (マップれんぼ) prototype, a browser-based deduction game that helps players locate an emergency shelter before time runs out. The experience mirrors the visual system documented in Figma and is implemented with React, Vite, Tailwind v4, Mapbox GL, and a shadcn-inspired component kit.

## Repository layout

| Path    | Description                                |
| ------- | ------------------------------------------ |
| `webapp/` | Vite/React client, Tailwind UI, local assets |
| `api/`    | Fastify-based multiplayer/session service    |

Unless noted otherwise, all paths in the sections below are relative to their directory (`webapp/` or `api/`).

## Webapp (Vite client)

- **Structure**: `src/App.tsx` orchestrates the end-to-end flow (Onboarding → Waiting Room → Gameplay) and injects the default game content from `src/data`.
- **Data**: Shelters load from the API (`/shelters`). Question templates/clue text are generated dynamically from `question_attributes` (seeded from GeoJSON) and localized strings in `src/assets/locales/*.json`. City-specific defaults (map start, categories) live in `src/data/cityContext.ts`.
- **Design System**: Bauhaus-inspired utilities, typography, and color tokens are centralized in `src/styles/globals.css`. The Tailwind entry point is `src/index.css`.
- **Maps**: Mapbox GL powers the interactive map via `src/components/MapView.tsx`. Tokens and tileset IDs are configured through environment variables (`.env.local` and `src/config/mapbox.ts`).
- **Docs**: Release steps and product notes continue to live under `docs/` (now inside `webapp/`).

### Running the client locally

```bash
cd webapp
npm install
npm run dev          # Vite dev server
```

Create `webapp/.env.local` with at least `VITE_MAPBOX_TOKEN` and point `VITE_API_BASE_URL` at your API deployment. For detailed Mapbox setup guidance, see `src/MAPBOX_SETUP.md`.

Optional webapp env toggles:

- `VITE_LIGHTNING_MINUTES` (default `60`) — duration of the lightning round
- `VITE_LIGHTNING_RADIUS_KM` (default `2`)
- `VITE_MULTIPLAYER_RADIUS_KM` (default `2`) — max km radius used when selecting or auto-falling back to a nearby shelter in multiplayer
- `VITE_ENABLE_PROXIMITY` (default `true`) — set to `false` to bypass proximity gating (and question cooldowns) for local testing
- `VITE_PROXIMITY_RADIUS_KM` (default `0.25`) — radius (in km) for proximity checks and nearby amenity counts
- `VITE_ENABLE_WRONG_GUESS_PENALTY` (default `false`) — when `true`, wrong guesses apply timer penalties (legacy mode); when `false`, you still have 3 attempts but the timer is unchanged
- `VITE_ONE_QUESTION_PER_LOCATION` (default `false`) — when `true`, players can ask only one question at their current location and must move before asking again
- `VITE_MAPBOX_STYLE_URL` (optional) — override the default Mapbox style
- `VITE_WS_BASE_URL` (defaults to `VITE_API_BASE_URL` with `ws` scheme) — explicit WebSocket host if it differs from the REST API

If you want the production build:

```bash
cd webapp
npm run build        # production bundle
npm run preview      # serves dist/ locally
```

### Main Screens & Interactions

- **Onboarding Screen** (`src/components/OnboardingScreen.tsx`): Presents Bauhaus-styled cards that let players host, join, or start a solo round. Help + toasts surface onboarding tips.
- **Waiting Room** (`src/components/WaitingRoom.tsx`): Displays the lobby roster, host controls, and readiness toggles. Transition logic is handled in `App.tsx`.
- **Game Screen** (`src/components/GameScreen.tsx`): Anchors the live session with a Mapbox canvas, floating action buttons, and animated overlays for clues (no trivia flow) and end-game states. Mission Control surfaces dynamic clues logged from correct answers.
- **Background resume**: When the browser tab is hidden or the phone is locked, the client snapshots session + gameplay state to `localStorage`. On return (within a 10-minute grace window), the timer is reconciled and the session is restored; multiplayer sessions attempt to reconnect and refresh the lobby snapshot.

### Core UI Modules

- **MapView** (`src/components/MapView.tsx`): Wraps Mapbox GL, handles POI markers, draws a 250m user range ring (driven by app-provided player location), exposes a location picker mode, and wires in Koto-specific layers (`src/cityContext/koto/layers.ts`). Geolocation uses one-shot fixes (no continuous tracking) to reduce battery drain. Measurement toasts are localized.
- **Map layer localization**: Layer popups are locale-aware. Templates in `src/cityContext/koto/layers.ts` use `{{t:key}}` for labels and `{{locale:enKey|jaKey}}` to choose the right property name per locale. Legend titles/descriptions resolve from `map.layers.items.*` and `map.layers.descriptions.*` in `src/assets/locales/*.json`, so keep those ids in sync with layer `id`s when adding/editing layers.
- **Question Drawer** (`src/components/QuestionDrawer.tsx`): Bottom sheet that gates question prompts based on proximity and logs every answer (both correct and incorrect) so players can refer back later. Nearby Amenity is a single dynamic question powered by a local spatial index over the GeoJSON data (`data/geojson/ihi_*`). It counts mapped categories (water stations, hospitals, AED, emergency storage, community centers, train stations, shrines/temples, flood gates, bridges) within a configurable radius (default 250m) of the current player location.
  - **Question cooldowns**: After any question is answered, that question enters a 120-second cooldown (per player/session). The drawer disables the prompt and shows a live countdown (`questions.cooldown` string) until it becomes available again. Set `VITE_ENABLE_PROXIMITY=false` to bypass proximity gating and cooldown delays during local testing.
- **Gameplay Panel** (`src/components/GameplayPanel.tsx`): Side panel for Mission Control, showing logged clues and strategy tips.
- **Clue Engine**: Questions and clues are driven by `question_attributes` plus locale strings (`questions.dynamic.*`). Every answer is captured: correct clues accumulate in the “Correct” list, wrong guesses land under “Wrong clues,” and the Mission Control panel can filter the map using either set (e.g., remove shelters matching all known wrong answers). Location category is always selectable; other categories require proximity (unless `VITE_ENABLE_PROXIMITY=false` for testing).
- **UI Primitives** (`src/components/ui/*`): Custom shadcn-derived kit (buttons, drawers, dialogs, etc.) that underpins the interaction model.
- **Proximity & spatial index**: `src/services/proximityIndex.ts` builds a Turf-based spatial index over all local GeoJSON (landmarks, support, shelters). Map amenities use `countAmenitiesWithinRadius` to unlock the Nearby Amenity question; the answer is validated against the secret shelter’s stored attributes (exact counts). Facility/Capacity and other proximity-gated categories unlock when any shelter is within the configured radius (default 250m), detected via the same index (`hasShelterWithinRadius`). Set `VITE_ENABLE_PROXIMITY=false` to bypass gating in local testing.
- **Answer validation & measurement**: Facility Type, Capacity/Resources, and all nearby-amenity questions are validated against the secret shelter’s stored attributes (`attributeValueLookup`), not the player’s surroundings. For spatial context, the Measure tool (MapView + `MeasurePanel`) lets players drop a center point and see every mapped point-of-interest within 250 m, along with per-layer counts and labels sourced from the same local GeoJSON bundles. Proximity affects availability; correctness always compares to the secret shelter data.

## Multiplayer API (Render/Supabase)

The `api/` directory houses a Fastify-based web service that manages multiplayer sessions end-to-end:

- Connects to Supabase Postgres using the `DATABASE_URL` env var.
- Provides REST endpoints for creating/joining sessions, toggling readiness, starting/finishing races, and fetching lobby snapshots.
- Issues JWTs scoped to a session/player combination; the frontend consumes these endpoints via `webapp/src/services/multiplayerSessionService.ts`.
- Ships with a WebSocket stream per session plus a cron endpoint for Render jobs to close expired sessions.

### Running the API locally

```bash
cd api
npm install
npm run dev          # Fastify + TSX watch
```

Configure `.env` using the template in `api/.env.example` before booting the service. Key vars:

- `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`
- `SESSION_TTL_MINUTES` (default `20`)
- `SESSION_MAX_PLAYERS` (default `8`)
- `SESSION_MAX_DISTANCE_KM` (default `2`) — max km radius for auto-selected fallback shelters when the requested shelter is already active

### API troubleshooting

- If your Supabase Postgres instance is paused due to inactivity, the API may still report `/health` as OK while data endpoints like `/shelters` and `/question-attributes` return `500`.
- In that case, resume the Supabase project (or wait for wake-up), then retry the API requests.

To build/start the compiled server (mirrors production):

```bash
cd api
npm run build        # emits dist/server.js
npm run start        # runs compiled server
```

## Running both services together

From the repo root you can install a lightweight dev dependency and launch both processes with one command:

```bash
npm install           # installs the root helper scripts (once)
npm run dev           # runs webapp dev + api dev concurrently
```

The helper scripts use `npm --prefix` under the hood, so you can still run `npm run dev:webapp` or `npm run dev:api` individually from the root.

### Multiplayer data seeding

The GeoJSON dataset now lives in a separate data repo (not shipped or deployed with the app). Point the importer at that copy via `SHELTER_DATA_PATH` or by cloning the data repo alongside this one (e.g., `../shelterhunt-data/geojson/ihi_shelters.geojson`). After setting up your Supabase project:

```bash
cd api
psql "$DATABASE_URL" -f sql/001_init_sessions.sql   # create/alter tables
psql "$DATABASE_URL" -f sql/002_question_attributes.sql   # create question attribute metadata table
SHELTER_DATA_PATH=../shelterhunt-data/geojson/ihi_shelters.geojson npm run seed:shelters
```

The importer assigns a random six-character `share_code` to every shelter and upserts the records into Supabase. The frontend and API read these codes from the database; the raw GeoJSON should remain versioned only in the data repo (see `data/` for helper scripts to export/import).

### Key endpoints

| Method | Path                      | Description                               |
| ------ | ------------------------ | ----------------------------------------- |
| POST   | `/sessions`              | Host creates a new shelter session        |
| POST   | `/sessions/join`         | Join an existing session by shelter code  |
| POST   | `/sessions/:id/ready`    | Toggle ready state (auth required)        |
| POST   | `/sessions/:id/heartbeat`| Presence heartbeat (`204` no response body) |
| POST   | `/sessions/:id/start`    | Host starts the race                      |
| GET    | `/sessions/:id`          | Fetch lobby snapshot (auth required)      |
| POST   | `/sessions/:id/finish`   | Mark race finished                        |
| POST   | `/tasks/expire-sessions` | Cron endpoint to close expired sessions   |
| GET    | `/shelters`              | List shelters (with hazard/attribute data) |
| GET    | `/question-attributes`   | List question attribute metadata (kind/options) |

Subscribe to `ws://…/sessions/:id/stream?token=…` using the returned JWT token to receive lobby events (`player_joined`, `ready_updated`, etc.).

### Multiplayer live locations (V1)

- Live player markers are shown only after the race starts (`state = racing`).
- Each client requests a fresh geolocation fix and sends `location_update` every 5 seconds over the existing session WebSocket.
- Server rounds incoming coordinates to a 50m grid before broadcasting to all players in the same session.
- Clients render remote players (not self) as labeled map markers and mark them stale after 1 minute without update.
- If a player has no valid location update, no marker is shown for that player.
- Small movement under the 50m grid can appear unchanged on the map until the player crosses into the next rounded cell.

WebSocket events used in V1:

- Client to server: `location_update` with `{ lat, lng }`
- Server to clients:
  - `player_location_updated`
  - `player_locations_snapshot` (sent on stream connect)
  - `player_location_removed` (on leave/disconnect)

Current limitation:

- Location state is in-memory in the API process (no DB persistence). On API restart, live markers rebuild from new client updates.

## Deployment

Deploy **webapp** as a Render Static Site (build: `npm install && npm run build` from `webapp/`, publish directory `dist/`). Deploy **api** as a Render Web Service (build: `npm install && npm run build` from `api/`, start: `npm run start`). Set `VITE_API_BASE_URL` in the webapp environment to the URL Render assigns to the API, and configure `SESSION_MAX_DISTANCE_KM` on the API if you need a different multiplayer fallback radius.
