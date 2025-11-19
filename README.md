
  # ShelterSearch · Location-Based Deduction Game

  This repository contains the ShelterSearch prototype, a browser-based deduction game that helps players locate an emergency shelter before time runs out. The experience mirrors the visual system documented in Figma and is implemented with React, Vite, Tailwind v4, Mapbox GL, and the shadcn-inspired component kit included in `src/components/ui`.

  ## Project Overview

  - **Structure**: `src/App.tsx` orchestrates the end-to-end flow (Onboarding → Waiting Room → Gameplay) and injects the default game content from `src/data`.
  - **Data**: Static POIs, trivia, question templates, and player states are defined in `src/data/gameContent.ts`. City-specific map defaults and question categories live in `src/data/cityContext.ts`.
  - **Design System**: Bauhaus-inspired utilities, typography, and color tokens are centralized in `src/styles/globals.css`. The Tailwind entry point is `src/index.css`.
  - **Maps**: `Mapbox GL` powers the interactive map via `src/components/MapView.tsx`. Tokens and tileset IDs are configured through environment variables (`.env.local` and `src/config/mapbox.ts`).
  - **Releases**: Follow the workflow in `docs/release-process.md` to publish versioned builds and GitHub releases.

  ## Multiplayer API (Render/Supabase)

  The `/api` directory houses a Fastify-based web service that manages multiplayer sessions end-to-end:

  - Connects to Supabase Postgres using the `DATABASE_URL` env var.
  - Provides REST endpoints for creating/joining sessions, toggling readiness, starting/finishing races, and fetching lobby snapshots.
  - Issues JWTs scoped to a session/player combination; the frontend (see `src/services/multiplayerSessionService.ts`) consumes these endpoints.
  - Ships with a WebSocket stream per session for lobby events plus a cron endpoint for Render jobs to close expired sessions.

  To run it locally:

  ```bash
  cd api
  npm install
  npm run dev
  ```

  Configure `.env` using the template in `api/.env.example` before booting the service.

  ### Multiplayer data seeding

  The GeoJSON file in `src/assets/Data/ihi_shelters.geojson` does **not** include multiplayer share codes. Those codes are generated and stored in Supabase when you run the seeding script. After setting up your Supabase project:

  ```bash
  cd api
  psql "$DATABASE_URL" -f sql/001_init_sessions.sql   # create/alter tables
  npm run seed:shelters                               # import GeoJSON + share codes
  ```

  The importer assigns a random six-character `share_code` to every shelter and upserts the records into Supabase. The frontend and API read these codes from the database, so the GeoJSON never needs to be modified locally.

  ## Main Screens & Interactions

  - **Onboarding Screen** (`src/components/OnboardingScreen.tsx`): Presents bold, Bauhaus-styled cards that let players host, join, or start a solo round. Help and toast notifications surface onboarding tips.
  - **Waiting Room** (`src/components/WaitingRoom.tsx`): Displays the lobby roster, host controls, and readiness toggles using the default player list. Transition logic is handled in `App.tsx`.
  - **Game Screen** (`src/components/GameScreen.tsx`): Anchors the live session with a Mapbox canvas, floating action buttons, and animated overlays for clues, trivia, and end-game states. Time tracking, guessing, and clue tally all originate here.

  ## Core UI Modules

  - **MapView** (`src/components/MapView.tsx`): Wraps Mapbox GL, handles POI markers, exposes a location picker mode, and wires in Koto-specific layers (`src/cityContext/koto/layers.ts`).
  - **Question Drawer** (`src/components/QuestionDrawer.tsx`): Bottom sheet that gates question prompts based on proximity, filters by category, and feeds the trivia flow.
  - **Trivia & Gameplay** (`src/components/TriviaModal.tsx`, `src/components/GameplayPanel.tsx`): Modal and side panel overlays that deliver Bauhaus-styled feedback, animated with `motion/react`.
  - **UI Primitives** (`src/components/ui/*`): Custom shadcn-derived kit (buttons, drawers, dialogs, etc.) that underpins the entire interaction model.

  ## Getting Started

  1. Install dependencies: `npm install`
  2. Add your Mapbox token to `.env.local` as `VITE_MAPBOX_TOKEN=<your-token>`
  3. Launch the dev server: `npm run dev`

  For detailed Mapbox setup guidance, see `MAPBOX_SETUP.md`. 
  
