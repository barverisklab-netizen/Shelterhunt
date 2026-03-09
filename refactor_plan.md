# Refactor Plan (Remaining Work Only)

## Scope of This Document
This file tracks only open items after the city-orchestrated + per-schema refactor baseline.
Completed work has been intentionally removed.

## 1. Remaining Workstreams

### 1.1 Runtime Stability and Regression Hardening
- Add integration tests that cover full app boot with API + DB under both conditions:
  - schema includes `shelters.question_answers`
  - schema missing `shelters.question_answers` (compat fallback path)
- Add a runtime switch for API behavior when `question_answers` is missing:
  - `strict` mode: fail startup
  - `compat` mode: allow fallback with warning
- Add explicit telemetry/log counters for fallback usage to avoid silent long-term drift.

### 1.2 Async and Race Condition Hardening (Frontend)
- Audit and unify request-cancellation behavior across:
  - shelters fetch
  - question attributes fetch
  - session snapshot refresh
  - map-driven async lookups
- Add stale-response guards for all multi-request flows where latest response should win.
- Add mount/unmount safety checks in long-lived map/gameplay effects to prevent setState-after-unmount.

### 1.3 Session Stream Determinism
- Add cross-client ordering tests for websocket event streams:
  - duplicate terminal events
  - reconnect + replay
  - out-of-order location updates
- Validate that client-side dedupe and ordering logic remains deterministic under latency spikes.
- Add explicit stream contract docs for idempotency and sequence handling.

### 1.4 Data Pipeline and Seed Guarantees
- Add CI job that runs full seed verification for target city/schema:
  - migrations
  - seed
  - verify
- Add data quality checks for city config and datasets:
  - every `questionCatalog` id maps to seed output
  - every `poiType` matcher maps to at least one observed category in fixtures (or explicit allow-empty)
- Add rollback-safe seed strategy documentation for partially failed seeds.

### 1.5 Deployment and Release Safety
- Enforce frontend/API release coupling by version manifest.
- Add per-city staged rollout procedure with concrete cutover and rollback commands.
- Add automated smoke gates per deployment:
  - `/health`
  - `/shelters`
  - `/question-attributes`
  - websocket connect
  - map layer toggle and nearby question flow

## 2. High-Risk Bug and Edge-Case Register

### 2.1 DB / Schema Edge Cases
- Missing `question_answers` column can silently degrade gameplay if compat fallback remains on.
- `question_attributes` may be present while `question_answers` values are empty/incomplete.
- Schema drift between `public` and non-public city schemas can pass health checks but break gameplay logic.

### 2.2 City Config Contract Edge Cases
- `poiTypes.rawCategoryMatchers` may fail due to whitespace/case/locale variants not covered by matcher normalization.
- `nearbyQuestion.countMin/countMax` can be valid syntactically but semantically wrong for city data distribution.
- `questionCatalog.sourceProperty` mismatches can produce empty answers without immediate UI failure.

### 2.3 Frontend Gameplay Edge Cases
- In `picker` mode, nearby category options can be visible while counts are stale after location changes.
- Cooldown behavior can diverge between `shared` and `per-poi` when quick repeated interactions occur.
- Dynamic categories not present in icon map can cause weak UX if default icon fallback is not consistently applied.

### 2.4 Map / Layer Edge Cases
- Rapid style reload + layer toggles can still produce intermittent source/layer timing races.
- Mixed geojson + vector layer setups can have inconsistent feature availability for measurement/filter flows.
- Locale-dependent labels in layer metadata can desync from popup content after language changes.

### 2.5 Session / Multiplayer Edge Cases
- Reconnect storms can duplicate client-side transition handling (win/lose/finish overlays).
- Host leave/promote transitions can race with ready/start events under network jitter.
- Rounded location updates may cause user-visible “stuck” movement and false assumptions in proximity checks.

## 3. Test and Validation Matrix (Open)

### 3.1 Contract Tests
- City config schema validation per city.
- Locale key coverage for all city question and POI label keys.
- Seed output coverage for required question ids.

### 3.2 API/Data Tests
- Migration compatibility tests across new and existing schemas.
- Seed idempotency tests with repeated runs.
- Strict verification that no orphan `question_attributes` exist outside city catalog.

### 3.3 Frontend Behavior Tests
- Nearby flow parity for both modes:
  - `picker`
  - `per-poi`
- Question assembly for non-Koto-style POI taxonomies.
- Clue filtering parity with JSONB answer source.

### 3.4 End-to-End Smoke
- App boot, layer toggle, ask question, clue filter, guess flow.
- Multiplayer create/join/ready/start/finish/leave.
- Recovery after API restart during active client session.

## 4. Release Gates (Must Pass)
- No city config validation warnings in startup logs.
- No schema fallback warnings in strict deployments.
- Seed verify passes for deployment city/schema.
- All smoke checks pass before cutover.
- Rollback drill executed at least once in staging for current release line.

## 5. Suggested Execution Order
1. Runtime strict-vs-compat policy for `question_answers` + telemetry.
2. Async/race hardening in frontend and stream determinism tests.
3. Data/seed CI enforcement and schema drift checks.
4. Release coupling, rollout automation, and rollback runbook finalization.

## 6. Lane-Based Agent Task Packs

### Lane A: Frontend Runtime and UX Determinism
Owner: Frontend engineer(s)
Primary folders:
- `webapp/src/components/**`
- `webapp/src/features/**`
- `webapp/src/services/**` (frontend-only)
- `webapp/src/cityContext/**`

Scope:
- Async cancellation and stale-response hardening.
- Nearby flow parity (`picker`, `per-poi`) and cooldown correctness.
- Map/layer timing race hardening.
- Category/icon fallback consistency for dynamic city categories.

Tasks:
- Standardize `AbortController` and request-version guards on all gameplay-critical fetches.
- Add protection against setState-after-unmount in map/gameplay effects.
- Add regression tests for:
  - nearby option availability after rapid location updates
  - cooldown behavior for `shared` vs `per-poi`
  - locale switch behavior for layer/popup labels
- Add a stress test scenario for rapid layer toggle + style reload cycles.

Definition of done checklist:
- [ ] No stale-response state overwrite in tested fetch flows.
- [ ] No runtime errors during rapid layer toggling/style reload.
- [ ] Nearby question flows pass for both modes.
- [ ] Dynamic category rendering works even when icon map lacks explicit category key.
- [ ] Test coverage added for all modified logic.

Risk checklist:
- [ ] Verify no accidental visual styling changes.
- [ ] Verify no Koto-specific constants reintroduced in gameplay logic.

---

### Lane B: API, Schema, and Session Stream Guarantees
Owner: Backend engineer(s)
Primary folders:
- `api/src/**`
- `api/scripts/**`
- `api/sql/**`

Scope:
- `question_answers` strict vs compat behavior.
- Schema drift detection and explicit runtime policy.
- Session stream ordering/idempotency behavior and tests.

Tasks:
- Add env-driven mode for `question_answers` handling:
  - strict: fail fast when missing
  - compat: fallback with warning
- Add startup/schema checks to report migration drift early.
- Add stream determinism tests:
  - duplicate terminal events
  - reconnect/replay ordering
  - out-of-order location updates
- Add structured logs/counters for compat fallback usage.

Definition of done checklist:
- [ ] Strict mode blocks startup on missing required schema contract.
- [ ] Compat mode produces explicit warning/log metric.
- [ ] Stream determinism tests pass for duplicate/out-of-order/reconnect cases.
- [ ] `/shelters` and `/question-attributes` stay stable across both modes.

Risk checklist:
- [ ] Ensure no cross-schema query leakage.
- [ ] Ensure fallback path cannot silently persist as default in production.

---

### Lane C: Data Pipeline, CI Gates, and Release Safety
Owner: Data/DevOps engineer(s)
Primary folders:
- `data/**`
- `.github/workflows/**`
- root docs/runbooks

Scope:
- Seed/migration CI enforcement.
- Data quality checks for city config and datasets.
- Per-city deployment smoke/rollback gates.

Tasks:
- Add CI job for per-city schema pipeline:
  - migrate
  - seed
  - verify
- Add quality validation for city-config coverage:
  - `questionCatalog` completeness
  - `poiTypes` matcher coverage (with explicit allow-empty rules)
- Add release gate automation for:
  - `/health`, `/shelters`, `/question-attributes`, websocket connect
  - map layer toggle + nearby question smoke
- Add rollback runbook with exact commands and expected verification outputs.

Definition of done checklist:
- [ ] CI fails on seed/migration drift and missing city-config coverage.
- [ ] Release pipeline enforces smoke gate pass before cutover.
- [ ] Rollback procedure is tested in staging at least once.
- [ ] Docs updated to match actual command and env behavior.

Risk checklist:
- [ ] Avoid city fallback defaults in scripts.
- [ ] Ensure CI matrix uses correct `DEPLOYED_CITY_ID` + `DB_SCHEMA` pairing.

## 7. Cross-Lane Merge Protocol

Branch model:
- `integration/city-runtime-hardening` as coordinator branch.
- Lane branches:
  - `lane/frontend-determinism`
  - `lane/api-schema-stream-hardening`
  - `lane/data-ci-release-gates`

Merge order:
1. Lane B (API strict/compat + stream tests)
2. Lane C (CI and release gates bound to API behavior)
3. Lane A (frontend hardening against finalized backend contract)

PR gate checklist (required for every lane):
- [ ] Scope limited to owned modules.
- [ ] Tests included and passing for changed behavior.
- [ ] Risk note and rollback note included in PR description.
- [ ] No unrelated refactors.

Coordinator integration checklist:
- [ ] Full smoke pass on integration branch.
- [ ] No schema fallback warnings in strict test environment.
- [ ] No unresolved cross-lane contract assumptions.
