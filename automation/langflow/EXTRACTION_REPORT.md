# CropSathi LangFlow Agent — Extraction Report

This report summarizes the extraction of the **CropSathi AI Agent** from the CropKart repository into the standalone `cropkart-langflow-agent` directory.

---

## 1. Extracted Files Table

| Extracted File | Original Location | Reason Included | Dependency |
| :--- | :--- | :--- | :--- |
| `flows/cropsathi_flow.json` | `langflow_flows.json` (Flow index 0) | Standalone JSON definition of CropSathi AI Agent (ID: `7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`). | LangFlow |
| `flows/langflow_flows.json` | `langflow_flows.json` | Exact exported flow list from CropKart for bulk import compatibility. | LangFlow |
| `agent/langflow_client.py` | Extracted from `backend/app/ai_logic.py` | Direct REST client for calling LangFlow `/api/v1/run/{flow_id}` and extracting nested text. | `httpx`, `python-dotenv` |
| `agent/crop_sathi.py` | Extracted from `backend/app/ai_logic.py` | Agent controller orchestrating LangFlow delegation and multilingual domain fallback. | `agent/langflow_client.py` |
| `agent/schemas.py` | Extracted from `backend/app/schemas.py` | Pydantic request/response schemas for `/api/ai/chat`. | `pydantic` |
| `agent/prompts/cropsathi_system_prompt.txt` | Extracted from `langflow_flows.json` (`Agent-pgSfi`) | System instructions defining agronomy boundaries, tool usage, and multilingual rules. | Text |
| `agent/prompts/system_prompt_guide.md` | New | Comprehensive documentation on prompt engineering, guardrails, and role personas. | Markdown |
| `tools/demand_forecast_tool.py` | Extracted from `langflow_flows.json` (`DemandForecastTool-1`) | Python custom LangFlow component for ML crop demand forecasting tool. | LangChain Core / LangFlow |
| `tools/market_prices_tool.py` | Extracted from `langflow_flows.json` (`MarketPricesTool-1`) | Python custom LangFlow component for mandi market price lookup tool. | LangChain Core / LangFlow |
| `tools/crop_listings_tool.py` | Extracted from `langflow_flows.json` (`CropListingsTool-1`) | Python custom LangFlow component for marketplace crop listings tool. | LangChain Core / LangFlow |
| `tools/buyer_requirements_tool.py` | Extracted from `langflow_flows.json` (`BuyerRequirementsTool-1`) | Python custom LangFlow component for wholesale buyer procurement requirements tool. | LangChain Core / LangFlow |
| `tools/tool_schemas.py` | Extracted from `backend/app/schemas.py` (lines 1104–1175) | Pydantic schemas defining standardized tool envelopes (`success`, `tool`, `data`, `error`). | `pydantic` |
| `api/mock_tools_server.py` | New (Synthesized from `backend/app/api/tools.py`) | Lightweight mock server implementing all 4 tool endpoints and chat proxy for independent testing. | `fastapi`, `uvicorn` |
| `api/chat_endpoint.py` | Extracted from `backend/app/main.py` | Standalone FastAPI APIRouter mounting `/api/ai/chat` for external integration. | `fastapi` |
| `docker-compose.yml` | Extracted from root `docker-compose.yml` | Dedicated Docker Compose file running the `langflow` service with persistent volume. | Docker |
| `docker/docker-compose.yml` | Mirror of root `docker-compose.yml` | Docker configuration located inside `docker/` directory. | Docker |
| `docker/README.md` | New | Deployment, volume persistence, and networking guide for LangFlow. | Markdown |
| `scripts/setup_cropsathi_flow.py` | Extracted from `scratch/setup_cropsathi_flow.py` | Automated script to programmatically import/patch the flow into LangFlow. | `httpx`, `python-dotenv` |
| `scripts/test_cropsathi_agent.py` | New (derived from `backend/tests/test_ai_tools.py`) | Diagnostic test suite validating agent queries across English, Hindi, and Marathi. | `httpx`, `asyncio` |
| `scripts/run_flow.py` | New | Interactive terminal console for chatting with CropSathi. | Python CLI |
| `tests/test_agent_tools.py` | New (derived from `backend/tests/test_ai_tools.py`) | Automated test suite verifying tool schemas and endpoint contracts (7/7 passing). | `pytest`, `fastapi` |
| `.env.example` | Derived from `.env.example` & `backend/.env` | Clean environment template with zero secrets, preserving flow ID and tool variables. | Configuration |
| `.gitignore` | New | Ignores secrets, bytecode, virtual environments, and SQLite databases. | Git |
| `requirements.txt` | New | Minimum required dependencies for running the extracted agent. | Pip |
| `README.md` | New | Complete documentation, architecture overview, and usage instructions. | Markdown |
| `ARCHITECTURE.md` | New | Complete architecture specification with connection parameters and protocols. | Markdown |
| `DEPENDENCIES.md` | New | Detailed audit separating internal components from external CropKart services. | Markdown |
| `EXTRACTION_REPORT.md` | New | This file. | Markdown |

---

## 2. Excluded Files & Rationale

The following directories and files from the original CropKart project were **intentionally NOT copied** to maintain a clean, focused, and lightweight extraction:

| Excluded Directory / File | Reason Excluded |
| :--- | :--- |
| `backend/app/database.py`, `backend/app/models/` | Direct PostgreSQL database models for users, orders, crops, and payments. CropSathi is decoupled from direct DB queries and accesses data exclusively through HTTP tool endpoints. |
| `backend/app/ml/inference.py`, `backend/app/services/demand_service.py` | 37-feature Ridge ML regression pipeline. Heavy scikit-learn training/inference code belongs to the CropKart ML service, not the agent runtime. |
| `backend/app/api/marketplace.py`, `orders.py`, `location.py`, `data.py` | Core marketplace CRUD endpoints (orders, listings, payments, geocoding) unrelated to agent reasoning. |
| `supabase/` (Migrations, seeds, schema) | Production database DDL and migration files. |
| `greencart-ui/`, `frontend/`, `website/` | Complete frontend user interfaces (Next.js, Vite, static prototype). Unrelated to the LangFlow agent backend. |
| `buyer_profiles.csv`, `buyer_requirements (2).csv`, `order_items.csv` | Heavy CSV data dumps (1.5+ MB) used for data ingestion, not agent execution. |
| `.venv/`, `node_modules/`, `package-lock.json` | Local environment virtual environments and Node build artifacts. |

---

## 3. Extraction Integrity Verification

1. **Original Files Preserved:**
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
2. **Zero Hardcoded Secrets:**
   - Real API keys (`LANGFLOW_API_KEY`, `CEDA_API_TOKEN`, `SUPABASE_KEY`, `GOOGLE_API_KEY`) were strictly excluded from `.env.example` and all code files.
3. **Flow ID Preserved:**
   - Known flow ID `7ee6cd01-deec-4f9c-8cfc-66e16d94ca10` was preserved across all flows, configurations, clients, and documentation.
4. **Codebase Boundary Audit:**
   - Zero imports in `cropkart-langflow-agent/` reference `backend.app...`, `cropkart...`, or parent relative paths (`../`).
   - The package operates cleanly on its own Python path.
