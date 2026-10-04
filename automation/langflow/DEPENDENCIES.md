# CropSathi LangFlow Agent — Dependency Audit & Traceability Matrix

This document provides a detailed breakdown of all internal components and external dependencies required by the **CropSathi AI Agent**.

---

## 1. Internal vs. External Architecture Boundary

The extracted `cropkart-langflow-agent` folder is designed to run self-contained for development and testing, while explicitly documenting and exposing integration interfaces for the production CropKart services.

```text
┌──────────────────────────────────────────────────────────┐
│             cropkart-langflow-agent (Self-Contained)      │
│                                                          │
│  ┌─────────────────────────┐  ┌───────────────────────┐  │
│  │   LangFlow Runtime      │  │  CropSathi Agent      │  │
│  │   (Docker Port 7860)    │◄─┼─ (agent/crop_sathi.py)│  │
│  │   Flow ID: 7ee6cd01...  │  │  (langflow_client.py) │  │
│  └────────────┬────────────┘  └───────────────────────┘  │
│               │ (tool calls)                             │
│  ┌────────────▼────────────┐  ┌───────────────────────┐  │
│  │   Custom LangFlow Tools │  │  Mock Tools Server    │  │
│  │   (tools/*.py)          │──┼─►(api/mock_tools_     │  │
│  └─────────────────────────┘  │   server.py :8000)    │  │
│                               └───────────────────────┘  │
└───────────────────────────┬──────────────────────────────┘
                            │ (In production)
                            ▼
┌──────────────────────────────────────────────────────────┐
│             External CropKart Production Services        │
│                                                          │
│  • CropKart FastAPI Backend (:8000)                      │
│  • Supabase PostgreSQL Database                          │
│  • CEDA / Agmarknet Mandi Records (1,454 rows)           │
│  • ML Ridge Demand Forecasting Inference Pipeline        │
│  • Google Gemini Cloud API (gemini-flash-lite-latest)    │
│  • Next.js / Greencart-UI Frontend Chat Widget           │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Dependency Matrix

| Component / Dependency | Original Project Location | Why CropSathi Needs It | Extraction Status | Operational Mode |
| :--- | :--- | :--- | :--- | :--- |
| **LangFlow Flow Definition** | `langflow_flows.json` | Core visual graph definition of the CropSathi Agent, nodes, prompts, model bindings, and tool wiring. Flow ID: `7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`. | **COPIED** to `flows/cropsathi_flow.json` and `flows/langflow_flows.json`. | **Internal** |
| **LangFlow Docker Container** | `docker-compose.yml` (`langflow` service) | Hosts the LangFlow runtime, flow compiler, and API engine on port 7860. | **COPIED & ISOLATED** to `docker-compose.yml` and `docker/docker-compose.yml`. | **Internal** |
| **LangFlow REST Client** | `backend/app/ai_logic.py` (`_extract_langflow_text`, `chat`) | Dispatches chat prompts to `/api/v1/run/{flow_id}` and parses nested LangFlow output JSON. | **COPIED & MODULARIZED** to `agent/langflow_client.py`. | **Internal** |
| **CropSathi Agent Controller & Fallback** | `backend/app/ai_logic.py` (`CropSathiAI`, `_generate_local_response`) | Orchestrates chat queries, multilingual support (English, Hindi, Marathi), and fallback logic when LangFlow is unreachable. | **COPIED & DECOUPLED** to `agent/crop_sathi.py`. | **Internal** |
| **System Prompt & Personas** | `langflow_flows.json` (`Agent-pgSfi`), `scratch/setup_cropsathi_flow.py` | Defines the instructions, agronomy boundaries, tool calling instructions, and language policies. | **EXTRACTED** to `agent/prompts/cropsathi_system_prompt.txt` and `agent/prompts/system_prompt_guide.md`. | **Internal** |
| **Chat Schemas** | `backend/app/schemas.py` (`ChatRequest`, `ChatResponse`) | Validates incoming chat requests and formats structured JSON responses. | **EXTRACTED** to `agent/schemas.py`. | **Internal** |
| **Demand Forecast Tool Component** | Embedded in `langflow_flows.json` (`DemandForecastTool-1`) | Custom LangFlow tool invoking the ML demand forecasting endpoint. | **EXTRACTED** to `tools/demand_forecast_tool.py`. | **Internal** |
| **Market Prices Tool Component** | Embedded in `langflow_flows.json` (`MarketPricesTool-1`) | Custom LangFlow tool querying APMC mandi market rates and modal prices. | **EXTRACTED** to `tools/market_prices_tool.py`. | **Internal** |
| **Crop Listings Tool Component** | Embedded in `langflow_flows.json` (`CropListingsTool-1`) | Custom LangFlow tool querying active farmer produce listings. | **EXTRACTED** to `tools/crop_listings_tool.py`. | **Internal** |
| **Buyer Requirements Tool Component** | Embedded in `langflow_flows.json` (`BuyerRequirementsTool-1`) | Custom LangFlow tool querying wholesale buyer procurement requests. | **EXTRACTED** to `tools/buyer_requirements_tool.py`. | **Internal** |
| **Tool Response Schemas** | `backend/app/schemas.py` (lines 1104–1175) | Pydantic validation schemas for standardized tool responses and failure envelopes. | **EXTRACTED** to `tools/tool_schemas.py`. | **Internal** |
| **Mock Tools Server** | Replaces need for full CropKart backend during isolated development | Implements mock endpoints for all 4 tools and chat proxy on port 8000. | **CREATED** at `api/mock_tools_server.py`. | **Internal** |
| **Flow Setup Script** | `scratch/setup_cropsathi_flow.py` | Programmatically uploads/updates the flow in a live LangFlow instance via REST. | **COPIED & ENHANCED** to `scripts/setup_cropsathi_flow.py`. | **Internal** |
| **Diagnostic Test Suite** | Derived from `backend/tests/test_ai_tools.py` | Verifies agent connectivity, multilingual queries, and tool endpoint envelopes. | **EXTRACTED** to `scripts/test_cropsathi_agent.py` and `tests/test_agent_tools.py`. | **Internal** |
| **CropKart FastAPI Backend** | `backend/app/main.py`, `backend/app/api/tools.py` | The live production backend hosting the 4 production tool endpoints. | **NOT COPIED** (documented as external integration point). | **External Dependency** |
| **ML Ridge Inference Pipeline** | `backend/app/ml/inference.py`, `backend/app/services/demand_service.py` | 37-feature Ridge regression model for crop demand forecasting. | **NOT COPIED** (requires heavy scikit-learn, joblib, and model weights in backend). | **External Dependency** |
| **Supabase PostgreSQL Database** | `supabase/migrations/`, `backend/app/database.py` | Stores production tables: `agricultural_market_data`, `crops`, `buyer_requirements`, `users`. | **NOT COPIED** (CropSathi accesses DB via FastAPI tool endpoints, never directly). | **External Dependency** |
| **Google Gemini Cloud API** | Google AI Studio | Cloud LLM provider (`gemini-flash-lite-latest`) configured in the LangFlow agent node. | **EXTERNAL SERVICE** (Requires `GOOGLE_API_KEY` configured in LangFlow). | **External Dependency** |
| **CropKart Frontend Widget** | `greencart-ui/` or `frontend/src/components/cropsathi/` | Floating UI chat widget used by end users to interact with CropSathi. | **NOT COPIED** (unrelated to the agent runtime; calls `/api/ai/chat`). | **External Dependency** |

---

## 3. Tool Dependency Contracts

### 1. Demand Forecast Tool
* **Target Endpoint:** `POST /api/tools/v1/demand-forecast`
* **Headers:** `X-CropSathi-Tool-Key: <key>`, `Content-Type: application/json`
* **Payload:**
  ```json
  {
    "crop": "Wheat",
    "location": "Pune",
    "days": 30
  }
  ```
* **Success Envelope:**
  ```json
  {
    "success": true,
    "tool": "demand_forecast",
    "data": {
      "crop": "Wheat",
      "location": "Pune",
      "forecast_days": 30,
      "predicted_demand": 1450.0,
      "unit": "quintals",
      "model_version": "demand-v1-ridge",
      "data_source": "historical_ceda_agmarknet"
    }
  }
  ```
* **Status:** In isolated mode, handled by `api/mock_tools_server.py`. In production, handled by CropKart FastAPI.

### 2. Market Prices Tool
* **Target Endpoint:** `GET /api/tools/v1/market-prices?crop=Wheat&location=Pune&limit=10`
* **Headers:** `X-CropSathi-Tool-Key: <key>`
* **Success Envelope:**
  ```json
  {
    "success": true,
    "tool": "market_prices",
    "data": {
      "crop": "Wheat",
      "location": "Pune",
      "total_records": 1,
      "records": [
        {
          "commodity": "Wheat",
          "variety": "Common",
          "mandi": "Pune APMC Mandi",
          "district": "Pune",
          "state": "Maharashtra",
          "record_date": "2026-09-28",
          "modal_price": 2420.0,
          "min_price": 2226.4,
          "max_price": 2613.6,
          "arrival_quantity": 450.0,
          "data_source": "Agmarknet CEDA Benchmark Data"
        }
      ]
    }
  }
  ```
* **Status:** In isolated mode, handled by `api/mock_tools_server.py`. In production, queries CropKart Supabase table `agricultural_market_data`.

### 3. Crop Listings Tool
* **Target Endpoint:** `GET /api/tools/v1/crop-listings?crop=Wheat&location=Pune&limit=10`
* **Headers:** `X-CropSathi-Tool-Key: <key>`
* **Success Envelope:**
  ```json
  {
    "success": true,
    "tool": "crop_listings",
    "data": {
      "total": 1,
      "listings": [
        {
          "id": "listing-mock-101",
          "farmer_id": "farmer-001",
          "name": "Wheat",
          "variety": "Grade A",
          "quantity": 250.0,
          "unit": "quintal",
          "price_per_unit": 2400.0,
          "location": "Pune Outskirts",
          "district": "Pune",
          "state": "Maharashtra",
          "quality_grade": "A",
          "harvest_date": "2026-09-20",
          "status": "AVAILABLE"
        }
      ]
    }
  }
  ```
* **Status:** In isolated mode, handled by `api/mock_tools_server.py`. In production, queries CropKart Supabase table `crops`.

### 4. Buyer Requirements Tool
* **Target Endpoint:** `GET /api/tools/v1/buyer-requirements?crop=Wheat&urgency=HIGH&limit=10`
* **Headers:** `X-CropSathi-Tool-Key: <key>`
* **Success Envelope:**
  ```json
  {
    "success": true,
    "tool": "buyer_requirements",
    "data": {
      "total": 1,
      "requirements": [
        {
          "id": "req-mock-201",
          "crop_name": "Wheat",
          "variety": "Sharbati / Common",
          "quantity": 500.0,
          "unit": "quintal",
          "target_price": 2450.0,
          "location": "Pune Industrial Area",
          "district": "Pune",
          "state": "Maharashtra",
          "urgency": "HIGH",
          "status": "OPEN"
        }
      ]
    }
  }
  ```
* **Status:** In isolated mode, handled by `api/mock_tools_server.py`. In production, queries CropKart Supabase table `buyer_requirements`.

---

## 4. Decoupling Summary

* **No direct database queries:** The agent runtime contains ZERO SQL code and does not connect to Postgres directly.
* **No ML dependencies required:** The agent interacts with ML inference strictly through HTTP JSON contracts.
* **Fallback Guarantee:** If any external service is down, `CropSathiAgent` falls back to built-in multilingual agronomy advisory without throwing 500 errors.
