# Shelterhunt Data

This folder is for city datasets and data tooling. It is not deployed with the frontend/API runtime.

## Layout
- `geojson/<city>/`
  - `shelters.geojson`
  - `support.geojson`
  - `landmark.geojson`
- `scripts/` data import/export/build/verify utilities

Current city dataset in repo:
- `geojson/koto/*`

## Scripts
- `npm run export:api`
  - pulls `/shelters` from API and writes `geojson/<city>/shelters.geojson`
  - supports `--city` and `--output`
- `npm run build:answers`
  - computes `250m_*` fields for a city dataset
  - supports `--city` and `--output`
- `npm run seed:db`
  - upserts shelters into selected DB schema
  - supports `--city`, `--schema`, and `--input`
- `npm run verify:seed`
  - verifies shelters + question_attributes in selected schema
  - supports `--schema`

## Environment
- `DATABASE_URL` required for `seed:db` / `verify:seed`
- `DB_SCHEMA` target schema (or pass `--schema`)
- `DEPLOYED_CITY_ID` default city (or pass `--city`)
- `DATA_API_BASE_URL` for `export:api`
- `SHELTER_DATA_PATH` optional source override for `seed:db`
- `OUTPUT_PATH` optional output override for `export:api` / `build:answers`

## Example (Koto)
```bash
cd data
npm run export:api -- --city=koto
npm run build:answers -- --city=koto
npm run seed:db -- --city=koto --schema=public
npm run verify:seed -- --schema=public
```

## Notes
- Legacy root files (`geojson/ihi_*.geojson`) are no longer the primary structure.
- Scripts still keep legacy fallback behavior for compatibility, but new city work should use `geojson/<city>/`.
