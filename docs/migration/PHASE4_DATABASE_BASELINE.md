# Phase 4 Database Baseline

## Before migration

Tables = 18  
market_data = 1,157 rows

The baseline was verified against the existing Supabase project before source copies were made. After all migration checks, the same live project still reports 18 public tables and 1,157 market_data rows.

All database access during this migration was read-only: catalog inspection and SELECTs only. No migration, seed, reset, truncate, delete, insert, update, or schema change was executed. The existing CEDA records were not modified.

## Live table inventory

alembic_version, users, farmer_profiles, buyer_profiles, transporter_profiles, user_addresses, crops, crop_listings, orders, order_items, payments, transporter_vehicles, transport_requests, transporter_locations, delivery_routes, market_data, market_price_history, demand_forecasts.

## Live market_data schema

| Column | Live PostgreSQL type | Nullability | Default |
|---|---|---|---|
| id | uuid | not null | gen_random_uuid() |
| crop_id | uuid | nullable | — |
| state | varchar(100) | not null | — |
| district | varchar(100) | not null | — |
| market_name | varchar(150) | not null | — |
| commodity | varchar(100) | not null | — |
| variety | varchar(100) | nullable | — |
| grade | varchar(50) | nullable | — |
| arrival_date | date | not null | — |
| arrival_quantity | numeric(12,2) | not null | 0.00 |
| quantity_unit | varchar(20) | not null | quintal |
| min_price | numeric(10,2) | not null | — |
| max_price | numeric(10,2) | not null | — |
| modal_price | numeric(10,2) | not null | — |
| source | varchar(50) | not null | agmarknet |
| created_at | timestamp with time zone | not null | now() |

Constraints and indexes observed:
- Primary key market_data_pkey on id.
- Foreign key market_data_crop_id_fkey: crop_id references crops.id, ON DELETE SET NULL.
- Unique expression index uq_market_data_dedup over commodity, market_name, COALESCE(variety, ''), COALESCE(grade, ''), and arrival_date.
- Non-unique indexes: ix_market_data_arrival_date(arrival_date), ix_market_data_comm_market_date(commodity, market_name, arrival_date), ix_market_data_state_district(state, district).
- Required columns are non-null as shown above. No separate unique constraint was reported by the catalog inspector; deduplication is enforced by the unique expression index.

## Live foreign keys (28)

| Relationship | Delete action |
|---|---|
| buyer_profiles.user_id -> users.id | CASCADE |
| crop_listings.crop_id -> crops.id | RESTRICT |
| crop_listings.farmer_id -> farmer_profiles.id | CASCADE |
| crop_listings.pickup_address_id -> user_addresses.id | RESTRICT |
| delivery_routes.transport_request_id -> transport_requests.id | CASCADE |
| demand_forecasts.crop_id -> crops.id | CASCADE |
| farmer_profiles.user_id -> users.id | CASCADE |
| market_data.crop_id -> crops.id | SET NULL |
| market_price_history.crop_id -> crops.id | CASCADE |
| market_price_history.market_data_id -> market_data.id | SET NULL |
| order_items.farmer_id -> farmer_profiles.id | RESTRICT |
| order_items.listing_id -> crop_listings.id | RESTRICT |
| order_items.order_id -> orders.id | CASCADE |
| orders.buyer_id -> buyer_profiles.id | RESTRICT |
| orders.delivery_address_id -> user_addresses.id | RESTRICT |
| payments.order_id -> orders.id | RESTRICT |
| payments.payee_id -> users.id | RESTRICT |
| payments.payer_id -> users.id | RESTRICT |
| transport_requests.delivery_address_id -> user_addresses.id | RESTRICT |
| transport_requests.order_id -> orders.id | CASCADE |
| transport_requests.pickup_address_id -> user_addresses.id | RESTRICT |
| transport_requests.transporter_id -> transporter_profiles.id | SET NULL |
| transport_requests.vehicle_id -> transporter_vehicles.id | SET NULL |
| transporter_locations.transport_request_id -> transport_requests.id | CASCADE |
| transporter_locations.vehicle_id -> transporter_vehicles.id | CASCADE |
| transporter_profiles.user_id -> users.id | CASCADE |
| transporter_vehicles.transporter_id -> transporter_profiles.id | CASCADE |
| user_addresses.user_id -> users.id | CASCADE |

## Representative preserved real CEDA records

| Commodity | State | District | Market | Date | Min | Max | Modal | Source |
|---|---|---|---|---|---:|---:|---:|---|
| Onion | Rajasthan | Jaipur | Chomu (F&V) | 2025-06-01 | 700 | 1300 | 1000 | ceda |
| Onion | Rajasthan | Jaipur | Kotputli | 2025-06-01 | 900 | 1100 | 1000 | ceda |
| Onion | Rajasthan | Jaipur | Chomu (F&V) | 2025-05-31 | 700 | 1300 | 1000 | ceda |
| Onion | Rajasthan | Jaipur | Kotputli | 2025-05-31 | 850 | 1050 | 950 | ceda |
| Wheat | Rajasthan | Alwar | Alwar | 2025-05-31 | 2420 | 2575 | 2475 | ceda |

The Wheat / Rajasthan / Alwar / Barodamev record was also re-read through FastAPI: 2025-05-31, min 2495, max 2518, modal 2505, source ceda.

Read-only data-quality checks found 0 duplicate natural-key groups and 0 rows with negative quantities/prices or inconsistent min/modal/max ordering.

## Local migration comparison

SCHEMA DIFFERENCE FOUND

Live database:
- 18 tables above, including 17 application tables and alembic_version.
- market_data has market_name, arrival_date, min_price, max_price, arrival_quantity, quantity_unit, source, and the live constraints/indexes listed above.

Local Supabase migration:
- supabase/migrations/20260925_cropkart_core.sql creates a legacy 17-table schema including crop_images, sample_requests, notifications, conversations, messages, forecast_results, and route_estimates. Its market_data column names include mandi, record_date, minimum_price, and maximum_price.
- supabase/migrations/20260929_fix_uuid_integer_keys.sql alters legacy buyer_requirements/order_items and creates or alters offers, transports, and marketplace_notifications, which are absent from the live table inventory.
- supabase/seed/seed.sql inserts synthetic/demo data into users, profiles, crops, sample_requests, orders, transport_requests, and notifications.

Difference:
The Supabase CLI SQL sequence does not describe the live 18-table schema and is not safe to apply to the current project. The second SQL migration contains ID type conversions using generated UUIDs and drops/recreates key constraints; those statements can rewrite identifiers and affect existing references. The seed inserts demo rows. These files are classified OUTDATED/PARTIAL and TEMPLATE/DEMO respectively. None were run.

Current backend migration:
- public.alembic_version reports 0001_cropkart_initial_schema.
- backend/alembic/versions/0001_initial_user.py has that same revision and creates the 17 live application table names (the 18th table is alembic_version).
- Its market_data columns, primary/foreign keys, three ordinary indexes, and unique deduplication index match the live catalog.
- This is the CURRENT installed backend Alembic revision. The full column-by-column comparison for the other 16 application tables was not performed here.
- Its downgrade contains drop_table operations for the application tables and would remove those tables and their data if executed. No Alembic command was run.

Recommended action:
Keep Supabase CLI migration files unchanged as historical material and do not apply them to the live project. If future schema management is needed, generate a complete read-only schema baseline, validate in a disposable local database, review the diff, and obtain explicit approval before any production action. Do not use supabase db reset.

## Post-copy verification

- Read-only connection through the copied FastAPI backend: SELECT 1 succeeded.
- Live public tables: 18.
- market_data rows: 1,157, unchanged from before migration.
- Live alembic_version: 0001_cropkart_initial_schema.
- Duplicate natural-key groups: 0.
- Invalid price/quantity rows under the checks above: 0.
- No production writes or migrations were executed.
