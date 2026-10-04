# CropKart Phase 4 Migration Result

## Outcome

The selected applications and local Supabase assets are consolidated under:

Local machine-specific path omitted.

A separate Git repository was initialized on main. No files were staged or committed. The migration copied source content and preserved all original project directories and their existing Git state. No old repository, duplicate UI, database row, table, or LangFlow volume was retired.

The pre-copy inventory and important source SHA-256 values are in PHASE4_BASELINE.md. The read-only live database baseline and schema comparison are in PHASE4_DATABASE_BASELINE.md.

## Consolidated layout

- frontend/: GreenCart root Next.js application selected by the user.
- backend/: custom FastAPI backend, CEDA integration, ingestion pipeline, and its independent Alembic migration.
- automation/langflow/: LangFlow agent and CropSathi flow export.
- supabase/migrations/: original CropKart Supabase CLI SQL files, preserved as historical assets.
- supabase/seed/seed.sql: original demo seed, preserved but not run.
- supabase/config.toml: CropKart-specific local config copied from the custom backend; local auth redirects use port 3001.
- docs/architecture/: component responsibilities, source selection, and environment boundaries.
- docs/migration/: baseline and result reports.
- docker-compose.yml and docker/: sanitized optional backend/LangFlow Compose configuration and notes.
- .github/workflows/verify.yml: frontend type-check and backend compile-only checks. It does not connect to Supabase.

The GreenCart root app was selected. The original nested greencart-ui folder has no independent package manifest, differs from the root app, and was not merged. The legacy CropKart UI was not selected. Both remain untouched in their original projects.

The original LangFlow Compose files were not copied because they contain insecure hard-coded defaults. The copied flow JSON has embedded provider api_key values blanked. The original active LangFlow flow and persisted volume were not changed.

## Supabase preservation and migration status

- Before migration: 18 tables; market_data = 1,157 rows.
- After local migration and validation: 18 tables; market_data = 1,157 rows.
- Read-only connection through the copied backend: SELECT 1 succeeded.
- Representative real CEDA records remain present and are shown in PHASE4_DATABASE_BASELINE.md.
- Natural-key duplicate groups found: 0.
- Invalid price/quantity rows under the documented consistency checks: 0.
- Database writes, migrations, seeds, resets, truncates, deletes, and schema changes executed: 0.

Migration classifications:
- backend/alembic/versions/0001_initial_user.py: CURRENT installed backend Alembic revision; live alembic_version is 0001_cropkart_initial_schema. Its 17 application table names match the live application inventory, and its market_data columns and indexes match the live catalog. The file’s downgrade drops application tables, so it was not run.
- supabase/migrations/20260925_cropkart_core.sql: OUTDATED/PARTIAL legacy CropKart schema.
- supabase/migrations/20260929_fix_uuid_integer_keys.sql: OUTDATED/PARTIAL; alters legacy tables, drops/recreates key constraints, and can rewrite identifiers with generated UUID values.
- supabase/seed/seed.sql: TEMPLATE/DEMO; contains synthetic/demo inserts and was not run.
- supabase/config.toml: CropKart local configuration, with no remote project reference.

The Supabase CLI SQL does not exactly match the live schema. No automatic correction was attempted. The differences and recommended future treatment are documented in the database baseline.

## Connection and validation results

- [PASS] Copied backend connected to Supabase using the existing private DATABASE_URL loaded only into the verification process; SELECT 1 succeeded.
- [PASS] Live public table count = 18.
- [PASS] Live market_data count = 1,157 before and after.
- [PASS] Representative CEDA records preserved.
- [PASS] Existing FastAPI health endpoint returned HTTP 200.
- [PASS] Existing market-data GET returned HTTP 200 with real CEDA observations.
- [PASS] GreenCart chat component uses NEXT_PUBLIC_CROPKART_API_URL; the frontend origin received HTTP 200 from FastAPI and the expected CORS allow-origin response.
- [PASS] Authenticated FastAPI CropSathi market-prices tool returned HTTP 200 and real Wheat/Alwar data from Supabase.
- [PASS] Live LangFlow flow GET returned HTTP 200 with 7 nodes and 6 edges; its market-prices, crop-listings, and buyer-requirements tool paths reference the FastAPI tool API.
- [PASS] frontend npm ci completed; npm run typecheck passed.
- [PASS] backend Python compile-only check passed.
- [PASS] Root Compose YAML, verification workflow YAML, and Supabase TOML parse successfully.
- [PASS] No real .env files were copied; examples contain placeholders/local URLs only. frontend/.env.example contains only NEXT_PUBLIC_CROPKART_API_URL; private Next.js server variables have a separate template.
- [PASS] No private frontend NEXT_PUBLIC_* variables were found.
- [PASS] No real secrets were committed: no commit exists and nothing is staged. The credential-pattern scan found only an explicitly test-like value in backend/tests/test_ceda_service.py.
- [PASS] Source project folders remain present and unchanged by the copy operation.
- [PASS] Local Supabase assets are organized and documented.

A read-only verifier process emitted the backend settings warning that FIRST_SUPERUSER_PASSWORD resolved to the development fallback. No startup initialization, seed helper, or test fixture was invoked. Set a real local/server-side value before any future account initialization.

The new Compose deployment was not started because the existing project already owns host ports 8001 and 7860. It references the existing external cropkart-langflow-data volume and does not create a local PostgreSQL instance. Current runtime checks used the already-running frontend/backend/LangFlow services. The copied frontend passed type checking; the copied backend also connected read-only to Supabase. No service cutover or data migration was performed.

## Environment variables

Current integration settings:
- FastAPI -> Supabase: DATABASE_URL (direct PostgreSQL connection; required).
- FastAPI -> LangFlow: LANGFLOW_URL, LANGFLOW_FLOW_ID, LANGFLOW_API_KEY.
- LangFlow -> FastAPI tools: FASTAPI_BASE_URL and CROPSATHI_TOOL_KEY.
- CEDA service: CEDA_API_KEY when CEDA requests are used.
- Browser -> FastAPI: NEXT_PUBLIC_CROPKART_API_URL only.
- GreenCart Next.js server routes: NEXTAUTH_URL, NEXTAUTH_SECRET, MONGODB_URI, OPENAI_API_KEY, OPENAI_MODEL, DATA_GOV_API_KEY and resource IDs, EXPRESS_PORT.

The current FastAPI database implementation does not require SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY. Those names appear only as blank optional placeholders in the backend/root templates. Private values must be supplied via ignored local files or server secret managers, never copied into browser-visible settings.

## Preserved for later approval

The original CropKart, FastAPI-template, GreenCart, and LangFlow folders remain available. Runtime cutover, removal/retirement of duplicate source projects, commits, and any production database action have not been performed. No further action on the live schema is recommended from the old Supabase SQL files.

