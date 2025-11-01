
  # Shelterhunt · Location-Based Deduction Game

  This repository contains the Shelterhunt prototype, a browser-based deduction game that helps players locate an emergency shelter before time runs out. The experience mirrors the visual system documented in Figma and is implemented with React, Vite, Tailwind v4, Mapbox GL, and the shadcn-inspired component kit included in `src/components/ui`.

  ## Project Overview

  - **Structure**: `src/App.tsx` orchestrates the end-to-end flow (Onboarding → Waiting Room → Gameplay) and injects mock data from `src/data`.
  - **Data**: Static POIs, trivia, question templates, and player states are defined in `src/data/mockData.ts`. City-specific map defaults and question categories live in `src/data/cityContext.ts`.
  - **Design System**: Bauhaus-inspired utilities, typography, and color tokens are centralized in `src/styles/globals.css`. The Tailwind entry point is `src/index.css`.
  - **Maps**: `Mapbox GL` powers the interactive map via `src/components/MapView.tsx`. Tokens and tileset IDs are configured through environment variables (`.env.local` and `src/config/mapbox.ts`).
  - **Releases**: Follow the workflow in `docs/release-process.md` to publish versioned builds and GitHub releases.

  ## Main Screens & Interactions

  - **Onboarding Screen** (`src/components/OnboardingScreen.tsx`): Presents bold, Bauhaus-styled cards that let players host, join, or start a solo round. Help and toast notifications surface onboarding tips.
  - **Waiting Room** (`src/components/WaitingRoom.tsx`): Displays the lobby roster, host controls, and readiness toggles using the mock player list. Transition logic is handled in `App.tsx`.
  - **Game Screen** (`src/components/GameScreen.tsx`): Anchors the live session with a Mapbox canvas, floating action buttons, and animated overlays for clues, trivia, and end-game states. Time tracking, guessing, and clue tally all originate here.

  ## Core UI Modules

  - **MapView** (`src/components/MapView.tsx`): Wraps Mapbox GL, handles POI markers, exposes a location picker mode, and wires in Koto-specific layers (`src/cityContext/koto/layers.ts`).
  - **Question Drawer** (`src/components/QuestionDrawer.tsx`): Bottom sheet that gates question prompts based on proximity, filters by category, and feeds the trivia flow.
  - **Trivia & Clues** (`src/components/TriviaModal.tsx`, `src/components/CluesPanel.tsx`): Modal and side panel overlays that deliver Bauhaus-styled feedback, animated with `motion/react`.
  - **UI Primitives** (`src/components/ui/*`): Custom shadcn-derived kit (buttons, drawers, dialogs, etc.) that underpins the entire interaction model.

  ## Getting Started

  1. Install dependencies: `npm install`
  2. Add your Mapbox token to `.env.local` as `VITE_MAPBOX_TOKEN=<your-token>`
  3. Launch the dev server: `npm run dev`

  For detailed Mapbox setup guidance, see `MAPBOX_SETUP.md`. Design references are available in the linked Figma file: https://www.figma.com/design/88OH71ZYHpnLVTbdIvkO8T/Location-Based-Deduction-Game.
  
