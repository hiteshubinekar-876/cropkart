# CropSathi AI Agent — Architecture & Data Flow

This document details the system topology, execution pipelines, network protocols, data contracts, and component connections of the **CropSathi LangFlow Agent**.

---

## 1. High-Level Architectural Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        USER / FRONTEND CLIENT                          │
│           (Web Browser / Greencart UI / Mobile Web Application)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP POST /api/ai/chat
                                    │ (JSON: {message, language, role})
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API INTEGRATION LAYER                           │
│  FastAPI /api/ai/chat (Backend or api/chat_endpoint.py)                │
│                                   │                                    │
│       ┌───────────────────────────┴────────────────────────────┐       │
│       │ CropSathiAgent Controller (agent/crop_sathi.py)         │       │
│       └───────────────────────────┬────────────────────────────┘       │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │ (If LangFlow reachable)                         │ (If unreachable/timeout)
           ▼                                                 ▼
┌──────────────────────────────────────┐          ┌──────────────────────┐
│       LANGFLOW RUNTIME ENGINE        │          │   LOCAL RULE ENGINE  │
│  Port 7860 (Container / Server)      │          │ (Multilingual Fallback)│
│                                      │          │ • Tomato / Soil      │
│  Flow ID: 7ee6cd01-deec-4f9c-...     │          │ • Drip Irrigation    │
│                                      │          │ • Pest Control       │
│  ┌────────────────────────────────┐  │          │ • Fertilizer / NPK   │
│  │ ChatInput (ChatInput-NQL2F)    │  │          │ • Hindi / Marathi    │
│  └───────────────┬────────────────┘  │          └──────────────────────┘
│                  │                   │
│                  ▼                   │
│  ┌────────────────────────────────┐  │
│  │ CropSathi Agent (Agent-pgSfi)  │  │
│  │ • System Prompt Instructions   │  │
│  │ • Reasoning & Tool Calling     │  │
│  └───────┬────────────────┬───────┘  │
│          │                │          │
│          ▼                ▼          │
│    ┌───────────┐    ┌─────────────┐  │
│    │ Google LLM│    │ 4 Connected │  │
│    │ (Gemini)  │    │ Agent Tools │  │
│    └───────────┘    └──────┬──────┘  │
│                            │         │
│  ┌────────────────────────┐│         │
│  │ ChatOutput (ChatOutput)││         │
│  └────────────────────────┘│         │
└────────────────────────────┼─────────┘
                             │
            ┌────────────────┴────────────────┐
            │ HTTP POST / GET (Tool Requests) │
            ▼                                 ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│   PRODUCTION CROPKART API    │   │      MOCK TOOLS SERVER       │
│   (backend/app/api/tools.py) │   │  (api/mock_tools_server.py)  │
│                              │   │                              │
│ • /demand-forecast (ML Model)│   │ • /demand-forecast (Mock ML) │
│ • /market-prices (CEDA DB)   │   │ • /market-prices (Mock CEDA) │
│ • /crop-listings (Crops DB)  │   │ • /crop-listings (Mock Crops)│
│ • /buyer-requirements (DB)   │   │ • /buyer-requirements (Mock) │
└──────────────────────────────┘   └──────────────────────────────┘
```

---

## 2. Component Connection Specifications

### Connection 1: Client to API Gateway
* **Component A (Source):** Frontend UI / Chat Widget
* **Component B (Target):** FastAPI Chat Endpoint (`/api/ai/chat`)
* **Protocol:** HTTP / HTTPS (REST)
* **Endpoint:** `POST /api/ai/chat`
* **Input Schema:**
  ```json
  {
    "message": "What is the market rate of wheat in Pune?",
    "language": "en",
    "role": "farmer"
  }
  ```
* **Output Schema:**
  ```json
  {
    "success": true,
    "message": "What is the market rate of wheat in Pune?",
    "response": "The current modal price of Wheat in Pune APMC Mandi is ₹2,420 per quintal...",
    "source": "langflow"
  }
  ```
* **Environment Variable:** `FASTAPI_BASE_URL` (`http://localhost:8001`)
* **Dependency:** `fastapi`, `pydantic`, `uvicorn`

---

### Connection 2: Agent Client to LangFlow Runtime
* **Component A (Source):** `LangFlowClient` (`agent/langflow_client.py`)
* **Component B (Target):** LangFlow Server (`image: langflowai/langflow`)
* **Protocol:** HTTP / REST
* **Endpoint:** `POST /api/v1/run/7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`
* **Headers:** `x-api-key: ${LANGFLOW_API_KEY}`, `Content-Type: application/json`
* **Input Payload:**
  ```json
  {
    "output_type": "chat",
    "input_type": "chat",
    "input_value": "What is the market rate of wheat in Pune?"
  }
  ```
* **Output Payload:**
  ```json
  {
    "outputs": [
      {
        "outputs": [
          {
            "results": {
              "message": {
                "data": {
                  "text": "The current modal price of Wheat in Pune APMC Mandi is ₹2,420 per quintal..."
                }
              }
            }
          }
        ]
      }
    ]
  }
  ```
* **Environment Variables:**
  * `LANGFLOW_URL` (default: `http://localhost:7860`)
  * `LANGFLOW_FLOW_ID` (`7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`)
  * `LANGFLOW_API_KEY`
  * `LANGFLOW_TIMEOUT` (default: `30.0`)
* **Dependency:** `httpx`

---

### Connection 3: LangFlow Agent to Cloud LLM Provider
* **Component A (Source):** LangFlow Agent Node (`Agent-pgSfi`)
* **Component B (Target):** Google Generative AI API (Google AI Studio)
* **Model Class:** `ChatGoogleGenerativeAIFixed`
* **Configured Model:** `gemini-flash-lite-latest` (or `gemini-2.5-flash`)
* **Protocol:** HTTPS (gRPC / REST via LangChain Google GenAI provider)
* **Input:** System prompt + Conversation history + Available tool schemas + User query
* **Output:** Assistant response text OR tool call request JSON (function name + parameters)
* **Environment Variable:** `GOOGLE_API_KEY` / `GEMINI_API_KEY`
* **Dependency:** LangFlow runtime Google provider extension

---

### Connection 4: LangFlow Tool 1 — Demand Forecasting
* **Component A (Source):** `DemandForecastToolComponent` (inside LangFlow container)
* **Component B (Target):** CropKart Backend or Mock Tools Server
* **Protocol:** HTTP / REST
* **Endpoint:** `POST /api/tools/v1/demand-forecast`
* **Headers:** `X-CropSathi-Tool-Key: ${CROPSATHI_TOOL_KEY}`
* **Input Parameters:**
  * `crop` (string): Crop commodity name (e.g. `Wheat`)
  * `location` (string): Target mandi or city (e.g. `Pune`)
  * `days` (integer): Forecast horizon in days (default: `30`)
* **Output Payload:**
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
* **Backend Implementation:** Invokes trained Ridge regression ML inference model using 37 historical lag & market features.

---

### Connection 5: LangFlow Tool 2 — Market Prices
* **Component A (Source):** `MarketPricesToolComponent`
* **Component B (Target):** CropKart Backend or Mock Tools Server
* **Protocol:** HTTP / REST
* **Endpoint:** `GET /api/tools/v1/market-prices?crop=Wheat&location=Pune&limit=10`
* **Headers:** `X-CropSathi-Tool-Key: ${CROPSATHI_TOOL_KEY}`
* **Output Payload:**
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
* **Backend Implementation:** SQL query against Supabase `agricultural_market_data` table (1,454 verified government mandi records).

---

### Connection 6: LangFlow Tool 3 — Crop Listings
* **Component A (Source):** `CropListingsToolComponent`
* **Component B (Target):** CropKart Backend or Mock Tools Server
* **Protocol:** HTTP / REST
* **Endpoint:** `GET /api/tools/v1/crop-listings?crop=Wheat&location=Pune&limit=10`
* **Headers:** `X-CropSathi-Tool-Key: ${CROPSATHI_TOOL_KEY}`
* **Output Payload:**
  ```json
  {
    "success": true,
    "tool": "crop_listings",
    "data": {
      "total": 1,
      "listings": [
        {
          "id": "listing-001",
          "farmer_id": "farmer-123",
          "name": "Wheat",
          "variety": "Lokwan",
          "quantity": 250.0,
          "unit": "quintal",
          "price_per_unit": 2400.0,
          "location": "Pune",
          "status": "AVAILABLE"
        }
      ]
    }
  }
  ```
* **Backend Implementation:** SQL query against Supabase `crops` table with active status filter.

---

### Connection 7: LangFlow Tool 4 — Buyer Requirements
* **Component A (Source):** `BuyerRequirementsToolComponent`
* **Component B (Target):** CropKart Backend or Mock Tools Server
* **Protocol:** HTTP / REST
* **Endpoint:** `GET /api/tools/v1/buyer-requirements?crop=Wheat&urgency=HIGH&limit=10`
* **Headers:** `X-CropSathi-Tool-Key: ${CROPSATHI_TOOL_KEY}`
* **Output Payload:**
  ```json
  {
    "success": true,
    "tool": "buyer_requirements",
    "data": {
      "total": 1,
      "requirements": [
        {
          "id": "req-001",
          "crop_name": "Wheat",
          "variety": "Sharbati",
          "quantity": 500.0,
          "unit": "quintal",
          "target_price": 2450.0,
          "location": "Pune",
          "urgency": "HIGH",
          "status": "OPEN"
        }
      ]
    }
  }
  ```
* **Backend Implementation:** SQL query against Supabase `buyer_requirements` table with procurement urgency filter.

---

## 3. Network Resolution in Docker

When LangFlow runs inside a Docker container and needs to reach the CropKart backend (or mock tools server) running on the host:
- Inside Docker Compose: `extra_hosts: ["host.docker.internal:host-gateway"]` is configured.
- Tool Component `base_url`: Defaults to `http://host.docker.internal:8001`.
- In native non-containerized environments: Base URL defaults to `http://localhost:8001`.
