# Shelterhunt Data (external)

This folder is the scaffold for your separate, version-controlled data repo. It is **not** deployed with the webapp or API; it only holds fixtures and helper scripts.

## Layout
- `geojson/` — place `ihi_shelters.geojson` here (kept out of git; a `.gitkeep` preserves the folder).
- `scripts/` — utility scripts to export/import the dataset.
- `package.json` — local script runner; install deps with `npm install` inside `data/`.

## Scripts
- `npm run export:api`  
  Pulls shelters from the API (`DATA_API_BASE_URL`, default `http://localhost:4000`) and writes `geojson/ihi_shelters.geojson`. Override output with `OUTPUT_PATH=...`.

- `npm run seed:db`  
  Imports `geojson/ihi_shelters.geojson` into Postgres via `DATABASE_URL` (Supabase works). Optionally override the source with `SHELTER_DATA_PATH=...`.

## Environment
- Export (`scripts/exportFromApi.mjs`):  
  - `DATA_API_BASE_URL` — API base to pull shelters from (default `http://localhost:4000`).  
  - `OUTPUT_PATH` — optional; where to write the GeoJSON (default `geojson/ihi_shelters.geojson`).  
  - Node 18+ recommended (uses built-in `fetch`).
- Import (`scripts/importToSupabase.mjs`):  
  - `DATABASE_URL` — Postgres/Supabase connection string (required).  
  - `SHELTER_DATA_PATH` — optional; GeoJSON path (default `geojson/ihi_shelters.geojson`).  

Both scripts load environment variables via `dotenv`, so you can create a local `.env` in `data/` instead of exporting values every time, e.g.:
```
DATABASE_URL=postgres://...
SHELTER_DATA_PATH=geojson/ihi_shelters.geojson
DATA_API_BASE_URL=https://your-api.example.com
OUTPUT_PATH=geojson/ihi_shelters.geojson
```
See `.env.example` for a template; keep your real `.env` out of git.

### Two ways to seed the DB with this GeoJSON
- From the API folder (uses `api/scripts/importShelters.ts`):  
  ```
  cd api
  DATABASE_URL=postgres://... \
  SHELTER_DATA_PATH=../data/geojson/ihi_shelters.geojson \
  npm run seed:shelters
  ```
- From this data folder (uses `scripts/importToSupabase.mjs`):  
  ```
  cd data
  DATABASE_URL=postgres://... \
  SHELTER_DATA_PATH=geojson/ihi_shelters.geojson \
  npm run seed:db
  ```

Both paths read the same GeoJSON file; pick whichever location is more convenient.

### How the API seeder finds the GeoJSON
The main app’s seeding script (`api/scripts/importShelters.ts`, run via `npm run seed:shelters` in `api/`) looks for the dataset in this order:
1. `SHELTER_DATA_PATH` (explicit path you set)
2. `../data/geojson/ihi_shelters.geojson` (this data repo cloned next to the app)
3. `api/assets/ihi_shelters.geojson` (legacy fallback)

It logs the path it uses and throws with setup guidance if none exist. Recommended: set `SHELTER_DATA_PATH=../data/geojson/ihi_shelters.geojson`.

## Typical workflow
1) Clone/create your data repo alongside the app (e.g., `../shelterhunt-data`), or keep this `data/` directory as your data repo.
2) Export from API:  
   ```bash
   cd data
   npm install
   DATA_API_BASE_URL=https://your-api.example.com npm run export:api
   ```
3) Commit the refreshed `geojson/ihi_shelters.geojson` to the data repo (not to the app repo).
4) Seed a DB when needed:  
   ```bash
   cd api
   DATABASE_URL=... SHELTER_DATA_PATH=../data/geojson/ihi_shelters.geojson npm run seed:shelters
   ```
   or run `npm run seed:db` from `data/` with `DATABASE_URL` set.

This keeps runtime data in the DB/API while keeping fixtures reproducible and versioned in a dedicated repo.
