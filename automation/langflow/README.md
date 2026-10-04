# CropKart CropSathi LangFlow Agent

This directory contains the standalone, extracted **CropSathi AI Agent** and its complete LangFlow configuration from the CropKart agricultural marketplace platform.

---

## 1. What This Folder Contains

* **LangFlow Flow Definitions (`flows/`):**
  * `flows/cropsathi_flow.json`: Exported single flow object for CropSathi AI Agent (Flow ID: `7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`).
  * `flows/langflow_flows.json`: Original flow collection export for bulk LangFlow import compatibility.
* **Agent Core (`agent/`):**
  * `agent/langflow_client.py`: High-performance asynchronous HTTP client for calling LangFlow's `/api/v1/run/{flow_id}` endpoint.
  * `agent/crop_sathi.py`: Controller orchestrating queries to LangFlow with intelligent, multilingual fallback rules.
  * `agent/schemas.py`: Pydantic models for chat requests and responses (`ChatRequest`, `ChatResponse`).
  * `agent/prompts/cropsathi_system_prompt.txt`: The system prompt configuring CropSathi's role and rules.
  * `agent/prompts/system_prompt_guide.md`: Detailed prompt engineering and multilingual guidelines.
* **Agent Tools (`tools/`):**
  * Standalone Python components for the 4 connected tools:
    1. `tools/demand_forecast_tool.py`: ML Ridge demand forecasting (predicts demand in quintals over 15/30/60 days).
    2. `tools/market_prices_tool.py`: Mandi price discovery (modal, min, max rates from CEDA / Agmarknet).
    3. `tools/crop_listings_tool.py`: Farmer crop listings and produce availability on the marketplace.
    4. `tools/buyer_requirements_tool.py`: Wholesale buyer procurement demands.
  * `tools/tool_schemas.py`: Standard machine-readable envelopes and record schemas.
* **API Integration & Mock Server (`api/`):**
  * `api/mock_tools_server.py`: Self-contained mock FastAPI server implementing all 4 tool endpoints and chat proxy.
  * `api/chat_endpoint.py`: Pluggable FastAPI APIRouter mounting `/api/ai/chat`.
* **Containerized Deployment (`docker/` & `docker-compose.yml`):**
  * Standalone Docker Compose configuration for LangFlow with SQLite volume persistence.
* **Scripts & Diagnostics (`scripts/` & `tests/`):**
  * `scripts/setup_cropsathi_flow.py`: Script to programmatically upload or patch the flow in a running LangFlow instance.
  * `scripts/test_cropsathi_agent.py`: End-to-end diagnostic test suite for English, Hindi, and Marathi queries.
  * `scripts/run_flow.py`: Interactive command-line chat session.
  * `tests/test_agent_tools.py`: Automated pytest suite verifying tool envelopes (7/7 passing).

---

## 2. Architecture Overview

```text
                     CropKart Frontend / Web Client
                                   │
                                   │ HTTP POST {message, language, role}
                                   ▼
                     FastAPI Backend (/api/ai/chat)
                                   │
                                   │ HTTP POST (x-api-key)
                                   ▼
                   LangFlow Server (http://localhost:7860)
                     POST /api/v1/run/<flow_id>
                                   │
                                   ▼
                   CropSathi AI Agent (Agent-pgSfi)
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
Google Generative AI       4 Connected Tools       Local Rule Engine
(gemini-flash-lite)        (tools/*.py)            (Multilingual Fallback)
                           • Demand Forecast       • Marathi / Hindi / EN
                           • Mandi Market Prices   • Drip / Soil Advisory
                           • Crop Listings
                           • Buyer Requirements
                                   │
                                   ▼
                FastAPI Tool Endpoints (/api/tools/v1/*)
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       CropKart Production API             Mock Tools Server
    (FastAPI + Supabase + ML Ridge)    (api/mock_tools_server.py)
```

---

## 3. Key Operational Parameters

* **LangFlow Service URL:** `http://localhost:7860`
* **Flow ID:** `7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`
* **API Execution Endpoint:** `POST /api/v1/run/7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`
* **Default LLM Provider:** Google Generative AI (`gemini-flash-lite-latest` or `gemini-2.5-flash`)
* **Tool Authentication Header:** `X-CropSathi-Tool-Key: <key>`

---

## 4. Environment Variables

Copy `.env.example` to `.env` to configure your environment:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `LANGFLOW_URL` | Base URL of the LangFlow instance | `http://localhost:7860` |
| `LANGFLOW_FLOW_ID` | Flow ID of CropSathi AI Agent | `7ee6cd01-deec-4f9c-8cfc-66e16d94ca10` |
| `LANGFLOW_API_KEY` | API Key generated in LangFlow UI | `your_langflow_api_key_here` |
| `LANGFLOW_TIMEOUT` | Request timeout in seconds | `30.0` |
| `LANGFLOW_SUPERUSER` | Admin username for LangFlow UI | `admin` |
| `LANGFLOW_SUPERUSER_PASSWORD`| Admin password for LangFlow UI | `admin123` |
| `GOOGLE_API_KEY` | Google Gemini API key for LLM node | `your_google_gemini_api_key_here` |
| `FASTAPI_BASE_URL` | URL of backend hosting tool endpoints | `http://host.docker.internal:8001` |
| `CROPSATHI_TOOL_KEY` | Shared key for authenticating tools | `your_cropsathi_tool_key_here` |

---

## 5. How to Run

### Step 1: Install Dependencies
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### Step 2: Start LangFlow via Docker
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker compose ps
```
The LangFlow UI is now accessible at `http://localhost:7860`.

### Step 3: Import the Flow into LangFlow

#### Option A: Automated Import (Recommended)
```bash
python scripts/setup_cropsathi_flow.py
```

#### Option B: Manual UI Import
1. Open `http://localhost:7860` in your browser.
2. Log in with `admin` / `admin123`.
3. Click **Import** -> Select `flows/cropsathi_flow.json`.
4. Under **Settings -> API Keys**, generate an API key and paste it into `.env` as `LANGFLOW_API_KEY`.
5. Under **Settings -> Global Variables**, set `GOOGLE_API_KEY` with your Gemini key.

### Step 4: Run Diagnostic Tests
```bash
python scripts/test_cropsathi_agent.py
```
Expected output:
```text
==================================================
   CropSathi AI Agent - Diagnostics & Test Suite  
==================================================
[*] LangFlow Base URL: http://localhost:7860
[*] Flow ID:           7ee6cd01-deec-4f9c-8cfc-66e16d94ca10
[*] API Key Present:   Yes
[*] LangFlow Online:   YES
--------------------------------------------------
[TEST] English - Soil Advice ... PASS
[TEST] Hindi - Soil Advice ... PASS
[TEST] Marathi - Irrigation Advice ... PASS
==================================================
```

### Step 5: Test the 4 Tools (Standalone Mode)
You can run the mock tools server to test all 4 tool endpoints without needing Postgres:
```bash
uvicorn api.mock_tools_server:app --port 8001 --reload
```
In another terminal, run the pytest suite:
```bash
python -m pytest tests/test_agent_tools.py
```

### Step 6: Interactive Terminal Chat
```bash
python scripts/run_flow.py
```
You can chat in English, Hindi, or Marathi:
```text
[You (en)]> What is the best fertilizer for tomato?
[CropSathi (langflow)]:
Tomatoes require balanced organic compost prior to planting...
```

---

## 6. Connecting to Production CropKart

To connect this agent to the live CropKart production system:
1. Start the main CropKart backend:
   ```bash
   uvicorn app.main:app --port 8001
   ```
2. Set in `.env`:
   ```env
   FASTAPI_BASE_URL=http://localhost:8001
   CROPSATHI_TOOL_KEY=<key configured in backend/.env>
   ```
3. LangFlow will automatically dispatch tool calls to the production endpoints (`/api/tools/v1/*`), retrieving live Supabase records and real Ridge ML demand forecasts.
