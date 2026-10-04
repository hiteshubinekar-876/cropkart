# CropKart integration overview

GreenCart Next.js frontend (:3001)
  -> HTTP REST/JSON
FastAPI (:8001)
  -> PostgreSQL via DATABASE_URL
Supabase

FastAPI (:8001)
  -> Flow API
LangFlow CropSathi (:7860)
  -> Agent tool requests
FastAPI (:8001)
  -> Supabase

LangFlow also persists flow state in the existing LangFlow volume.

## Responsibilities

- GreenCart is the selected website UI. Its root app is canonical for this migration. A nested greencart-ui copy exists in the original project and differs; it was not merged.
- FastAPI owns application APIs, normalization, database access, and LangFlow tool endpoints.
- Supabase remains the authoritative managed database. The backend uses a PostgreSQL DATABASE_URL rather than a browser Supabase client.
- LangFlow hosts the CropSathi flow and invokes FastAPI tools. The copied flow JSON is an editable export with embedded provider API-key values removed.
- Existing MongoDB-backed GreenCart routes remain part of the selected UI code; they are not replaced by the FastAPI/Supabase backend in this migration.

## Environment boundaries

Only NEXT_PUBLIC_CROPKART_API_URL is intended for browser access. GreenCart's Next.js server routes also use MongoDB, NextAuth, OpenAI, and data.gov settings; keep those server-side. FastAPI and LangFlow private keys, database URLs, CEDA credentials, and Supabase service-role credentials must never be exposed through a NEXT_PUBLIC_ variable.
