# ShelterSearch · Location-Based Deduction Game

This repository contains the ShelterSearch prototype, a browser-based deduction game that helps players locate an emergency shelter before time runs out. The experience mirrors the visual system documented in Figma and is implemented with React, Vite, Tailwind v4, Mapbox GL, and a shadcn-inspired component kit.

## Repository layout

| Path    | Description                                |
| ------- | ------------------------------------------ |
| `webapp/` | Vite/React client, Tailwind UI, local assets |
| `api/`    | Fastify-based multiplayer/session service    |

Unless noted otherwise, all paths in the sections below are relative to their directory (`webapp/` or `api/`).

## Webapp (Vite client)

- **Structure**: `src/App.tsx` orchestrates the end-to-end flow (Onboarding → Waiting Room → Gameplay) and injects the default game content from `src/data`.
- **Data**: Static POIs, trivia, question templates, and player states live in `src/data/gameContent.ts`. City-specific defaults exist in `src/data/cityContext.ts`.
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

If you want the production build:

```bash
cd webapp
npm run build        # production bundle
npm run preview      # serves dist/ locally
```

### Main Screens & Interactions

- **Onboarding Screen** (`src/components/OnboardingScreen.tsx`): Presents Bauhaus-styled cards that let players host, join, or start a solo round. Help + toasts surface onboarding tips.
- **Waiting Room** (`src/components/WaitingRoom.tsx`): Displays the lobby roster, host controls, and readiness toggles. Transition logic is handled in `App.tsx`.
- **Game Screen** (`src/components/GameScreen.tsx`): Anchors the live session with a Mapbox canvas, floating action buttons, and animated overlays for clues, trivia, and end-game states.

### Core UI Modules

- **MapView** (`src/components/MapView.tsx`): Wraps Mapbox GL, handles POI markers, exposes a location picker mode, and wires in Koto-specific layers (`src/cityContext/koto/layers.ts`).
- **Question Drawer** (`src/components/QuestionDrawer.tsx`): Bottom sheet that gates question prompts based on proximity and feeds the trivia flow.
- **Trivia & Gameplay** (`src/components/TriviaModal.tsx`, `src/components/GameplayPanel.tsx`): Modal and side panel overlays that deliver Bauhaus-styled feedback, animated with `motion/react`.
- **UI Primitives** (`src/components/ui/*`): Custom shadcn-derived kit (buttons, drawers, dialogs, etc.) that underpins the interaction model.

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

Configure `.env` using the template in `api/.env.example` before booting the service.

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

Two copies of the GeoJSON dataset are now stored under `webapp/src/assets/Data/ihi_shelters.geojson` (for local visualization) and `api/assets/ihi_shelters.geojson` (for seeding). After setting up your Supabase project:

```bash
cd api
psql "$DATABASE_URL" -f sql/001_init_sessions.sql   # create/alter tables
npm run seed:shelters                               # import GeoJSON + share codes
```

The importer assigns a random six-character `share_code` to every shelter and upserts the records into Supabase. The frontend and API read these codes from the database, so the GeoJSON never needs manual edits.

### Key endpoints

| Method | Path                      | Description                               |
| ------ | ------------------------ | ----------------------------------------- |
| POST   | `/sessions`              | Host creates a new shelter session        |
| POST   | `/sessions/join`         | Join an existing session by shelter code  |
| POST   | `/sessions/:id/ready`    | Toggle ready state (auth required)        |
| POST   | `/sessions/:id/start`    | Host starts the race                      |
| GET    | `/sessions/:id`          | Fetch lobby snapshot (auth required)      |
| POST   | `/sessions/:id/finish`   | Mark race finished                        |
| POST   | `/tasks/expire-sessions` | Cron endpoint to close expired sessions   |

Subscribe to `ws://…/sessions/:id/stream?token=…` using the returned JWT token to receive lobby events (`player_joined`, `ready_updated`, etc.).

## Deployment

Deploy **webapp** as a Render Static Site (build: `npm install && npm run build` from `webapp/`, publish directory `dist/`). Deploy **api** as a Render Web Service (build: `npm install && npm run build` from `api/`, start: `npm run start`). Set `VITE_API_BASE_URL` in the webapp environment to the URL Render assigns to the API.
