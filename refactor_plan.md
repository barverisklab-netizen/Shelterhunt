# Maintainability Refactor Plan

## Goal
Refactor `webapp` so `App.tsx` and `GameScreen.tsx` become thin coordinators, with domain logic moved into feature hooks/services, while preserving current behavior.

## Scope
- In scope: frontend refactor only (`webapp/src`).
- Out of scope: backend schema/API changes, gameplay rules redesign, visual redesign.

## Monolith Hotspots (Current)
- `webapp/src/App.tsx`: session lifecycle, socket management, timers, persistence, routing, and UI orchestration are mixed.
- `webapp/src/components/GameScreen.tsx`: proximity, geolocation, snapshot persistence, question cooldowns, elevation logic, and gameplay UI are mixed.
- `webapp/src/index.css`: very large global CSS surface area.

## Working Model For Multiple Developers
- Each task has exclusive file ownership.
- Shared contracts are frozen first.
- Every PR is behavior-preserving and small.
- Prefer additive extraction first, then cutover/removal.

## Branch Strategy
- Base branch: `refactor/maintainable-structure`
- Short-lived branches per task:
  - `refactor/rf-01-shared-contracts`
  - `refactor/rf-02-gameplay-snapshot`
  - `refactor/rf-03-gameplay-cooldowns`
  - `refactor/rf-04-gameplay-proximity`
  - `refactor/rf-05-gameplay-elevation`
  - `refactor/rf-06-session-timer`
  - `refactor/rf-07-session-socket`
  - `refactor/rf-08-app-shell`
  - `refactor/rf-09-style-scope`
  - `refactor/rf-10-integration-tests`

## Directory Target
```text
webapp/src/
  app/
    AppShell.tsx
  features/
    gameplay/
      hooks/
        useGameplaySnapshot.ts
        useQuestionCooldowns.ts
        useProximityAndAmenities.ts
        useElevation.ts
      services/
        gameplaySnapshot.ts
    session/
      hooks/
        useSessionState.ts
        useSessionTimer.ts
        useMultiplayerSocket.ts
        useSnapshotPersistence.ts
    location/
      hooks/
        usePlayerLocation.ts
        useLocationBroadcast.ts
  styles/
    theme.css
    gameplay.css
```

## Shared Contract Freeze (Must Be First)
### [x] RF-01: Define and freeze shared contracts
- Files:
  - `webapp/src/types/game.ts` (extend with extracted hook input/output types)
  - `webapp/src/components/GameScreen.tsx` (type-only integration points)
  - `webapp/src/App.tsx` (type-only integration points)
- Deliverables:
  - Explicit ownership contract:
    - Session-owned: `timer`, `wrongGuessCount`, `remoteOutcome`, `resumeId`, `playerLocation`.
    - Gameplay-owned: clue list, filters, panel state, cooldown map, elevation state.
  - Typed interfaces for hook boundaries.
- Depends on: none.
- Can run in parallel with: none.
- Done when:
  - Hook signatures are agreed and compiled, with no behavior changes.

## Parallel Lanes After RF-01

## Lane A (Gameplay Extraction)
### [x] RF-02: Extract gameplay snapshot persistence
- Files:
  - New: `webapp/src/features/gameplay/services/gameplaySnapshot.ts`
  - New: `webapp/src/features/gameplay/hooks/useGameplaySnapshot.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - `GAMEPLAY_SNAPSHOT_KEY`, versioning, save/restore, visibility/pagehide handlers.
- Depends on: RF-01.
- Can run in parallel with: RF-06, RF-07, RF-09.
- Done when:
  - `GameScreen` no longer directly reads/writes gameplay snapshot storage.
  - Resume behavior unchanged.

### [x] RF-03: Extract question cooldown logic
- Files:
  - New: `webapp/src/features/gameplay/hooks/useQuestionCooldowns.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - Cooldown interval ticker, lock map, cooldown start helper.
- Depends on: RF-01.
- Can run in parallel with: RF-02, RF-06, RF-07, RF-09.
- Done when:
  - `GameScreen` consumes `lockedQuestionIds`, `questionCooldowns`, `startQuestionCooldown` from hook.

### [x] RF-04: Extract proximity + amenities logic
- Files:
  - New: `webapp/src/features/gameplay/hooks/useProximityAndAmenities.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - Nearby shelter detection, amenity query triggers, stale location reset, poll helpers.
- Depends on: RF-01.
- Can run in parallel with: RF-02, RF-03, RF-06, RF-07, RF-09.
- Done when:
  - `GameScreen` only uses returned proximity/amenity state and actions.

### [x] RF-05: Extract elevation logic
- Files:
  - New: `webapp/src/features/gameplay/hooks/useElevation.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - Elevation sample handling and all derived elevation labels/status flags.
- Depends on: RF-01.
- Can run in parallel with: RF-02, RF-03, RF-04, RF-06, RF-07, RF-09.
- Done when:
  - Elevation badge uses hook outputs only.

## Lane B (Session/App Extraction)
### [x] RF-06: Extract session timer + penalties
- Files:
  - New: `webapp/src/features/session/hooks/useSessionTimer.ts`
  - New: `webapp/src/features/session/hooks/useSessionState.ts`
  - Edit: `webapp/src/App.tsx`
- Move out:
  - Timer state, critical threshold, time-up handling, penalty count ownership.
- Depends on: RF-01.
- Can run in parallel with: RF-02, RF-03, RF-04, RF-05, RF-09.
- Done when:
  - `App.tsx` does not implement timer state machine inline.
  - `wrongGuessCount` has one owner in session layer.

### [x] RF-07: Extract multiplayer socket lifecycle
- Files:
  - New: `webapp/src/features/session/hooks/useMultiplayerSocket.ts`
  - Edit: `webapp/src/App.tsx`
- Move out:
  - Socket connect/reconnect, session event routing, heartbeat behavior.
- Depends on: RF-01.
- Can run in parallel with: RF-02, RF-03, RF-04, RF-05, RF-09.
- Done when:
  - `App.tsx` consumes socket hook outputs and actions only.

### [x] RF-08: Introduce app shell
- Files:
  - New: `webapp/src/app/AppShell.tsx`
  - Edit: `webapp/src/App.tsx`
- Move out:
  - Screen routing/render orchestration.
- Depends on: RF-06, RF-07 (recommended), RF-02 through RF-05 (optional but preferred).
- Can run in parallel with: RF-09 (partial), RF-10 prep.
- Done when:
  - `App.tsx` becomes bootstrap/composition entrypoint.
  - `AppShell.tsx` handles route-like state rendering.

## Lane C (Styling and Tests)
### [ ] RF-09: Scope style layers
- Files:
  - New: `webapp/src/styles/theme.css`
  - New: `webapp/src/styles/gameplay.css`
  - Edit: `webapp/src/index.css`
  - Edit: touched components as needed
- Move out:
  - Feature-specific styling from global CSS.
- Depends on: RF-01.
- Can run in parallel with RF-02 through RF-07.
- Done when:
  - `index.css` contains only global/base/theme foundations.
  - Feature-specific overrides live in feature/style files.

### [x] RF-10: Add integration coverage for extracted flows
- Files:
  - New tests under `webapp/src` (integration-focused)
  - Existing updates as needed:
    - `webapp/src/services/multiplayerSessionService.race.test.ts`
    - `webapp/src/services/proximityIndex.test.ts`
    - `webapp/src/utils/lightningSelection.test.ts`
- Focus:
  - Resume from snapshot.
  - Wrong-guess penalty progression.
  - Multiplayer win/loss propagation to gameplay screen.
  - Proximity + cooldown behavior parity.
- Depends on: RF-02 through RF-08.
- Can run in parallel with: final cleanup.
- Done when:
  - Critical flows have automated assertions and pass in CI.

## Touch Map (Conflict Avoidance)
- `webapp/src/components/GameScreen.tsx`:
  - Primary owner during RF-02 to RF-05: Lane A lead.
  - No other lane edits this file during active Lane A PRs.
- `webapp/src/App.tsx`:
  - Primary owner during RF-06 to RF-08: Lane B lead.
  - Lane A should not edit this file except type import fixes.
- `webapp/src/index.css`:
  - Primary owner during RF-09: Lane C lead.
- Shared type files:
  - Changes only in RF-01 or by explicit joint PR.

## Merge Order
1. RF-01 (contract freeze)
2. RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-09 in parallel (independent PRs)
3. RF-08 (app shell consolidation)
4. RF-10 (integration coverage and final stabilization)

## PR Template (Use For Every Task)
- Summary of extracted responsibility.
- Files changed.
- Contract impact (if any).
- Behavior parity checklist.
- Manual test evidence.
- Automated test results.
- Known risks.

## Behavior Parity Checklist
- Solo mode start, gameplay, and end flow unchanged.
- Multiplayer host/create/join/start flow unchanged.
- Resume from refresh restores expected state.
- Timer and penalty logic unchanged.
- Map proximity and amenities still update correctly.

## Suggested Team Assignment
- Dev A: Lane A (RF-02 to RF-05).
- Dev B: Lane B (RF-06 to RF-08).
- Dev C: Lane C (RF-09 and RF-10).
- Tech lead/reviewer: owns RF-01 and final merge sequencing.
