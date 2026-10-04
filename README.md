# CropKart Monorepo

This is the consolidated working tree for the CropKart website, FastAPI backend, LangFlow CropSathi flow assets, and Supabase project files. Original source repositories were copied, not moved or deleted.

## Layout

- frontend/: selected GreenCart root Next.js application. The nested greencart-ui folder was not selected because it lacks an independent package manifest and differs from the root app; its source remains in the original GreenCart project.
- backend/: custom FastAPI application and its independent Alembic migrations.
- automation/langflow/: LangFlow agent source and flow export. The copied flow export has provider API-key values redacted; configure provider credentials in the runtime instead.
- supabase/: historical local Supabase SQL and CropKart local config. See supabase/README.md before using anything there.
- docs/migration/: source and database baselines plus final migration results.
- docker-compose.yml: optional backend/LangFlow deployment using the existing external LangFlow data volume. It does not start a local PostgreSQL database because Supabase is the managed database.

## Connections

GreenCart Next.js (:3000) -> FastAPI (:8001) -> Supabase PostgreSQL
FastAPI (:8001) -> LangFlow CropSathi (:7860)
LangFlow CropSathi (:7860) -> FastAPI tool endpoints (:8001) -> Supabase

The FastAPI backend connects directly to Supabase PostgreSQL through DATABASE_URL. Frontend calls use NEXT_PUBLIC_API_URL. LangFlow calls FastAPI tool endpoints; the backend calls LangFlow for agent requests. Only NEXT_PUBLIC_API_URL is browser-exposed. The frontend app also has server-only MongoDB/Auth/OpenAI/data.gov settings; keep those in the Next.js server runtime secret store, never under a NEXT_PUBLIC_ name. Supabase service-role credentials, DATABASE_URL, CEDA_API_KEY, and LANGFLOW_API_KEY must remain server-side.

## Local setup

1. Copy frontend/.env.example and frontend/.env.server.example values into an ignored frontend/.env.local. The former contains the browser-safe API URL; the latter contains server-only secrets used by Next.js routes.
2. Copy backend/.env.example to backend/.env and set DATABASE_URL plus the required private backend values.
3. Copy automation/langflow/.env.example to automation/langflow/.env and set runtime credentials.
4. Install frontend dependencies from frontend/package-lock.json, then run the dev server on port 3000:
   - npm ci
   - npm run dev -- --port 3000
5. Run FastAPI on port 8001 with the project Python environment:
   - uvicorn app.main:app --reload --port 8001
6. Use the existing LangFlow deployment or the optional root Compose configuration. The current machine already uses ports 8001 and 7860, so do not start a second copy on those ports.

Never run backend prestart scripts, Alembic upgrades, SQL migrations, Supabase seeds, or pytest against the live DATABASE_URL during this migration. The backend test fixture and startup seed helpers can write to the configured database.

## Supabase safety

The current database remains authoritative and unchanged. Read the baseline and Supabase README before managing schema. The copied Supabase migrations do not match the live schema and the seed contains demo data. No production database command is part of the normal setup.

## Source preservation

The source GreenCart, FastAPI-template, CropKart, and LangFlow folders remain in place with their original Git state. No source directory or existing database record was retired or deleted. The target is initialized as a separate Git repository after validation; no commit is created as part of this migration.

