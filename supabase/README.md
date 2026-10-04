# Supabase assets and safety notes

The existing managed Supabase project is authoritative. Its verified baseline is 18 tables and 1,157 rows in market_data. The migration process used read-only catalog queries and SELECTs only; no migration, seed, reset, truncate, delete, or update was run.

## Assets copied

- migrations/20260925_cropkart_core.sql: historical CropKart schema draft; OUTDATED/PARTIAL compared with the current live schema.
- migrations/20260929_fix_uuid_integer_keys.sql: historical follow-up; OUTDATED/PARTIAL and contains destructive-risk DDL.
- seed/seed.sql: synthetic/demo seed data; TEMPLATE/DEMO only. Never run against the existing project.
- config.toml: CropKart-specific local Supabase configuration copied from the custom backend. It has no remote project reference and uses localhost:3001 for local auth redirects.

These files are retained for audit/history. They are not a deployment migration plan.

## Live schema comparison

The live database has the 18 tables listed in docs/migration/PHASE4_DATABASE_BASELINE.md. Its market_data fields include market_name, arrival_date, min_price, max_price, arrival_quantity, quantity_unit, source, and created_at. The older SQL instead uses mandi, record_date, minimum_price, and maximum_price and omits live fields/constraints. The follow-up SQL refers to legacy tables not present in the live table inventory.

The 20260929 SQL drops/recreates primary-key constraints and changes identifiers using uuid_generate_v4(), which can rewrite existing IDs and affect references. Other DDL creates/changes tables and indexes. The seed performs inserts. Do not apply any of these files to production. Do not use supabase db reset.

If schema management is needed later, create a separately reviewed baseline from a full live schema export, validate it against a disposable local database, then obtain explicit approval before any production action.
