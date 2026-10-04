# Environment and credential boundaries

## Required for current integrations

- FastAPI to Supabase: DATABASE_URL (PostgreSQL DSN) in backend server runtime.
- FastAPI to LangFlow: LANGFLOW_URL, LANGFLOW_FLOW_ID, and LANGFLOW_API_KEY in backend server runtime.
- LangFlow tools to FastAPI: FASTAPI_BASE_URL and matching CROPSATHI_TOOL_KEY in LangFlow/backend runtime.
- CEDA price service: CEDA_API_KEY in backend server runtime when CEDA requests are used.
- Browser to FastAPI: NEXT_PUBLIC_CROPKART_API_URL in the Next.js frontend.
- Existing GreenCart server routes: NEXTAUTH_URL, NEXTAUTH_SECRET, MONGODB_URI, OPENAI_API_KEY, OPENAI_MODEL, DATA_GOV_API_KEY, DATA_GOV_MANDI_RESOURCE_ID, DATA_GOV_RAINFALL_RESOURCE_ID, DATA_GOV_SCHEMES_RESOURCE_ID, and EXPRESS_PORT as used by the app.

## Rules

- Do not copy real .env files. All included .env.example files use blanks, local nonsecret URLs, or explicit placeholder text. frontend/.env.example contains only the browser-safe API URL. Server-only GreenCart values are isolated in frontend/.env.server.example.
- Keep NEXT_PUBLIC_CROPKART_API_URL as the only browser-visible integration setting. Never prefix database URLs, passwords, Supabase service-role keys, LangFlow keys, CEDA keys, or private model keys with NEXT_PUBLIC_.
- The current FastAPI database code requires DATABASE_URL and does not currently require SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.
- The root and backend Supabase key entries are optional template placeholders only. They are not needed by the current direct PostgreSQL integration.

