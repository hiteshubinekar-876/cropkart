# Source selection and conflict record

## Frontend

The user selected the GreenCart project. The root GreenCart directory contains the active Next.js app and package manifest, while nested greencart-ui has no independent package manifest/config. At the time of capture, 107 same-path files matched, two differed (.env.example and components/chat/chat-assistant.tsx), and nested-only pages existed at app/auctions/[id]/page.tsx and app/products/[slug]/page.tsx. The monorepo uses the root app as frontend/ and leaves nested greencart-ui in the original source tree. No merge or deletion was performed.

## Backend

The custom FastAPI backend from FastAPI-template/cropkart-backend is copied into backend/. The parent template Supabase config was not selected. The CropKart-specific local config from the custom backend was copied to root supabase/config.toml. Backend-owned Alembic migrations remain in backend/alembic/ and are a separate stream from Supabase CLI migrations.

## LangFlow

The standalone cropkart-langflow-agent source is copied into automation/langflow/. Original Compose files were not copied because they contain insecure hard-coded defaults. A sanitized root Compose file is provided. The checked-in flow JSON copy has provider api_key values redacted; the original active flow and persistent LangFlow state are unchanged.

## Legacy CropKart website

The legacy CropKart UI was not chosen as frontend. The GreenCart selection is honored; legacy project source remains untouched in its original directory.
