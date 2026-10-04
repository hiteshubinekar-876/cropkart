# LangFlow Docker Deployment Guide

This directory documents the containerized deployment of the LangFlow runtime for the **CropSathi AI Agent**.

---

## 1. Container Overview

* **Image:** `langflowai/langflow:latest`
* **Exposed Port:** `7860` (Web UI & REST API)
* **Default URL:** `http://localhost:7860`
* **Network Host Gateway:** `host.docker.internal:host-gateway` configured to allow LangFlow tool components to reach host/external services (such as FastAPI on port 8000).

---

## 2. Persistent Storage

LangFlow stores flow definitions, component cache, user settings, and execution logs in an internal SQLite database.

* **Database Path inside container:** `/app/data/langflow.db`
* **Volume Name:** `cropkart-langflow-data`
* **Mount Point:** `/app/data`

When running `docker compose down`, persistent data remains safe inside the Docker volume `cropkart-langflow-data`. When restarted, all imported flows (including `CropSathi AI Agent`) remain intact.

---

## 3. Quick Start

### Starting LangFlow
```bash
docker compose up -d
```

### Checking Container Logs
```bash
docker compose logs -f langflow
```

### Stopping LangFlow
```bash
docker compose down
```

---

## 4. Initial Setup & Flow Import

1. Open your browser and navigate to `http://localhost:7860`.
2. Log in using the superuser credentials:
   * **Username:** `admin` (or value of `LANGFLOW_SUPERUSER`)
   * **Password:** `admin123` (or value of `LANGFLOW_SUPERUSER_PASSWORD`)
3. Navigate to **My Projects** -> **Import** -> Select `flows/cropsathi_flow.json`.
4. Verify the flow ID matches: `7ee6cd01-deec-4f9c-8cfc-66e16d94ca10`.
5. Under LangFlow **Settings -> API Keys**, generate a new API key and copy it to your `.env` as `LANGFLOW_API_KEY`.
6. Under LangFlow **Settings -> Global Variables**, add `GOOGLE_API_KEY` for Google Generative AI (Gemini).
