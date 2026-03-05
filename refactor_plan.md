# Per-City Deployment Refactor Plan

## Objective
Support new cities by deploying one city per stack (frontend + API), with city identity fixed at deploy time and data isolated by schema.

## Execution Status (Coordinator)
- [x] Lane A baseline implemented: deployed-city bootstrap + city layers contract + map lifecycle guards.
- [x] Lane B baseline implemented: modular question runtime + city question adapter + stale-response guards.
- [x] Lane C implemented: API fail-fast env + schema-bound DB behavior + stream ordering/idempotency safeguards.
- [x] Lane D implemented: data scripts support city/schema inputs + seed verification script.
- [x] Lane E baseline implemented: env templates and release workflow aligned to API/webapp build outputs.
- [ ] Full gate validation pending in CI/local Node environment (`npm`/`node` unavailable in current execution environment).

## Operating Model (New Baseline)
- Each city has its own domain (or subdomain) and API deployment.
- Cities share one PostgreSQL instance, with one schema per city.
- App runtime does not switch cities.
- City is selected once via environment/config at build/deploy time.
- UI visuals remain unchanged unless city-owned map/layer style config requires differences.

---

## Phase 1: Deployment Contract and City Binding

### [x] RF-DC-01: Deploy-time city contract
- Define required env variables:
  - `DEPLOYED_CITY_ID` (required)
  - `DB_SCHEMA` (required, e.g. `public`, `osaka`, `nagoya`)
  - `VITE_MAPBOX_TOKEN` (required)
  - `VITE_MAPBOX_USERNAME` (required when vector tiles are used)
  - `VITE_MAPBOX_STYLE_URL` (optional override)
- Fail fast at startup if `DEPLOYED_CITY_ID` is missing/unknown.
- Ensure frontend and API both bind to the same city id and schema.

### [x] RF-DC-02: City module contract
- Standardize city module shape under `webapp/src/cityContext/<city>/`.
- Keep one file for map setup per city:
  - `layers.ts` exports both:
    - `mapStyle` (style URL + fallback)
    - `layers` (sources + paint/layout/filter/label/popup)
- Keep question behavior city-owned via `questionAdapter.ts`.

---

## Phase 2: Frontend Refactor (Single-City Runtime)

### [x] RF-DC-03: Frontend bootstrap by `DEPLOYED_CITY_ID`
- Replace `defaultCityContext` assumptions with resolved city config from env.
- Wire `MapView`, `GameScreen`, Help modal, and map hooks to the deployed city module.

### [x] RF-DC-04: Remove runtime city-switch logic
- Remove/avoid URL/query/lobby city switching paths.
- Remove multi-city state branching in app shell and gameplay flow.

### [x] RF-DC-05: Keep map style + layer lifecycle deterministic
- Load map style from city `layers.ts -> mapStyle`.
- Ensure style reload and layer re-attach remain idempotent.
- Keep source/layer registry checks to avoid duplicate add/remove errors.
- Add map liveness guards before source/layer operations (`map exists`, `style loaded`, `source not already attached`).

### [x] RF-DC-06: Question runtime modularization (city-owned)
- Extract question assembly out of `GameScreen` into `features/gameplay/questions/`.
- Use city `questionAdapter.ts` for:
  - attribute-to-category mapping
  - question/clue templates
  - nearby amenity behavior
- Keep fallback order explicit:
  1) city i18n key
  2) shared i18n key
  3) generated fallback from `question_attributes.label`
- Add adapter validation to fail fast when required question ids/templates are missing.

---

## Phase 3: API and Data (Per-City Stack)

### [x] RF-DC-07: API city binding (not query filtering)
- API reads one configured city at startup (`DEPLOYED_CITY_ID`).
- API rejects requests if deployment city is misconfigured.
- Do not add/require `city_id` query parameters for normal gameplay routes.

### [x] RF-DC-08: Data pipeline per city
- Keep city-specific datasets in `data/geojson/<city>/`.
- Parameterize scripts with `--city` to produce city-owned seed artifacts.
- Ensure `question_attributes` are generated for that city dataset.

### [x] RF-DC-09: DB strategy per city
- One PostgreSQL instance with one schema per city; no `city_id` filtering in gameplay queries.
- Keep current city in `public` for now (no forced rename); new cities use dedicated schemas.
- API must use schema-qualified queries or enforced per-connection `search_path` to `DB_SCHEMA`.
- Maintain schema parity across city schemas via the same migration chain.
- Clarify seed expectations:
  - shelter seed only is incomplete
  - full gameplay requires `question_attributes` seed too.
- Make seeding idempotent and atomic (transactional upserts + deterministic ordering).

---

## Phase 4: Hardening and Failure-Mode Controls

### [ ] RF-DC-14: Frontend async race and stale-state guards
- Add `AbortController` to cancellable fetches (shelters, attributes, snapshot refresh, designated shelter queries).
- Ignore stale responses using request ids/version checks before state commits.
- Prevent setState-after-unmount and stale closure updates in long-running map/gameplay effects.

### [ ] RF-DC-15: Websocket/session event ordering hardening
- Define event ordering/idempotency rules for multiplayer stream events.
- Ignore duplicate or out-of-order terminal events (`race_finished`, player leave/join bursts).
- Add heartbeat/backoff policy and deterministic reconnect behavior.
- Add monotonic server sequence numbers (or timestamps) in stream payloads for client-side ordering guards.

### [x] RF-DC-16: Config/schema validation gates
- Validate city `layers.ts`, `questionAdapter.ts`, and env contract at startup/build.
- Block deploy when required config is missing (style URL, source ids, mandatory question ids).
- Add contract tests per city module.

### [ ] RF-DC-17: Migration and seed safety
- Enforce pre-deploy checks:
  - DB reachable
  - target schema exists (`DB_SCHEMA`)
  - migration drift check
  - seed artifact presence and checksum
- Run migrations in CI/CD per target schema with rollback playbook per release.
- Add post-seed verification queries (row counts + required attributes present).

### [ ] RF-DC-18: Deployment safety and rollback
- Use staged rollout (canary/blue-green) per city deployment.
- Add smoke gates before traffic cutover:
  - map loads
  - shelters endpoint healthy
  - question attributes endpoint healthy
  - websocket connects and receives heartbeat
- Enforce release coupling so frontend and API for a city deploy from the same release manifest/version.
- Document one-command rollback path and DB restore point strategy.

---

## Phase 5: Delivery and Operations

### [x] RF-DC-10: Environment and secrets templates
- Create per-city env templates for frontend/API.
- Include `DEPLOYED_CITY_ID` + `DB_SCHEMA` in API env templates.
- Keep Mapbox and DB credentials environment-only.
- No tokens/usernames hardcoded in source.

### [ ] RF-DC-11: Deployment templates per city
- Add deployment matrix (one job per city) or one pipeline with city parameter.
- Standardize naming:
  - frontend app name
  - API app name
  - database schema name
  - domain/subdomain

### [ ] RF-DC-12: CORS/domain/session hardening
- Configure API CORS per city domain.
- Ensure websocket/session endpoints use the city deployment domain only.

### [ ] RF-DC-13: Monitoring and runbooks per city
- Track logs/metrics per city deployment.
- Add city-specific rollback steps and smoke-check checklist.
- Add alert thresholds for:
  - API 5xx rate
  - websocket disconnect spikes
  - map/style load failures
  - seed/migration failures during release.

---

## Parallel Execution Lanes

### Lane A: Frontend Architecture
- RF-DC-02
- RF-DC-03
- RF-DC-04
- RF-DC-05
- RF-DC-06
- RF-DC-14
- RF-DC-16

### Lane B: API + Data
- RF-DC-07
- RF-DC-08
- RF-DC-09
- RF-DC-15
- RF-DC-17

### Lane C: Platform/DevOps
- RF-DC-01
- RF-DC-10
- RF-DC-11
- RF-DC-12
- RF-DC-13
- RF-DC-18

### Lane D: Validation
- Integration and parity checks after A+B+C complete.

---

## Dependency Graph

### Must complete first
- RF-DC-01 blocks RF-DC-03, RF-DC-07, RF-DC-10.
- RF-DC-02 blocks RF-DC-03 and RF-DC-05.

### Frontend chain
- RF-DC-03 blocks RF-DC-04 and RF-DC-06.
- RF-DC-05 runs with RF-DC-06, then both gate validation.
- RF-DC-03 and RF-DC-06 block RF-DC-14.
- RF-DC-02 and RF-DC-06 block RF-DC-16.

### API/Data chain
- RF-DC-07 and RF-DC-08 block RF-DC-09 completion.
- RF-DC-07 blocks RF-DC-15.
- RF-DC-08 and RF-DC-09 block RF-DC-17.

### Platform chain
- RF-DC-10 blocks RF-DC-11 and RF-DC-12.
- RF-DC-11 and RF-DC-12 block RF-DC-13 readiness checks.
- RF-DC-11, RF-DC-12, RF-DC-13, and RF-DC-17 block RF-DC-18.

### Final validation
- Lane D depends on RF-DC-04, RF-DC-05, RF-DC-06, RF-DC-09, RF-DC-11, RF-DC-12, RF-DC-14, RF-DC-15, RF-DC-16, RF-DC-17, RF-DC-18.

---

## QA and Acceptance

### Required checks per city deployment
- Map loads with city `mapStyle`.
- Layer toggles render correctly (geojson/vector as configured).
- Repeated style reload/toggle cycles do not throw map source/layer errors.
- Questions work for both families:
  - facility/location attributes from shelters
  - nearby 250m POI logic
- Lightning mode selects valid shelters for the city dataset.
- Multiplayer flows work on that city domain (session + websocket).
- Session stream tolerates reconnect and ignores duplicate terminal events.
- Build/startup fails when city config/env contract is incomplete.
- API cannot read/write outside configured schema.
- Seed verification passes (`question_attributes` presence + expected row thresholds).
- No Mapbox token or username hardcoded in source.

### Definition of Done
- New city onboarding requires:
  - city dataset prep
  - city config module
  - schema creation + env + deployment setup
- No shared-runtime city switching complexity remains in app code.
- Each city deployment is independently testable, deployable, and rollbackable.
- Async race/stale response protections are covered by automated tests.
- Deployment includes canary/smoke gates and documented rollback path.
