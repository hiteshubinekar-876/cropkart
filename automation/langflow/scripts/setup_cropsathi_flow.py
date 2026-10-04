"""
scripts/setup_cropsathi_flow.py - Import & Setup CropSathi Flow into LangFlow.

Uploads or updates the CropSathi AI Agent flow (ID: 7ee6cd01-deec-4f9c-8cfc-66e16d94ca10)
into a running LangFlow instance.

Usage:
    python scripts/setup_cropsathi_flow.py
"""

import os
import sys
import json
from pathlib import Path
import httpx
from dotenv import load_dotenv

# Load environment
base_dir = Path(__file__).resolve().parent.parent
load_dotenv(base_dir / ".env")
load_dotenv()

LANGFLOW_URL = os.getenv("LANGFLOW_URL", "http://localhost:7860").rstrip("/")
LANGFLOW_API_KEY = os.getenv("LANGFLOW_API_KEY", "")
FLOW_ID = os.getenv("LANGFLOW_FLOW_ID", "7ee6cd01-deec-4f9c-8cfc-66e16d94ca10")

headers = {
    "Content-Type": "application/json",
}
if LANGFLOW_API_KEY:
    headers["x-api-key"] = LANGFLOW_API_KEY.strip()


def main():
    print(f"[*] Target LangFlow Server: {LANGFLOW_URL}")
    print(f"[*] Target Flow ID: {FLOW_ID}")

    # Check server availability
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"{LANGFLOW_URL}/health")
            print(f"[+] LangFlow server is responding (Status: {resp.status_code})")
    except Exception as exc:
        print(f"[!] Could not reach LangFlow server at {LANGFLOW_URL}: {exc}")
        print("    Ensure the LangFlow container is running: docker compose up -d")
        sys.exit(1)

    # Load flow JSON
    flow_file = base_dir / "flows" / "cropsathi_flow.json"
    if not flow_file.exists():
        print(f"[!] Flow file not found: {flow_file}")
        sys.exit(1)

    with open(flow_file, "r", encoding="utf-8") as f:
        flow_data = json.load(f)

    if isinstance(flow_data, list):
        flow_data = flow_data[0]

    with httpx.Client(timeout=30.0, headers=headers) as client:
        # Check if flow already exists
        check_resp = client.get(f"{LANGFLOW_URL}/api/v1/flows/{FLOW_ID}")
        if check_resp.status_code == 200:
            print(f"[*] Flow {FLOW_ID} already exists in LangFlow. Updating...")
            patch_resp = client.patch(f"{LANGFLOW_URL}/api/v1/flows/{FLOW_ID}", json=flow_data)
            if patch_resp.status_code in [200, 201]:
                print(f"[+] Successfully updated CropSathi flow ({FLOW_ID}).")
            else:
                print(f"[!] Update returned {patch_resp.status_code}: {patch_resp.text[:300]}")
        else:
            print(f"[*] Flow {FLOW_ID} not found. Creating new flow...")
            post_resp = client.post(f"{LANGFLOW_URL}/api/v1/flows/", json=flow_data)
            if post_resp.status_code in [200, 201]:
                print(f"[+] Successfully created CropSathi flow ({FLOW_ID}).")
            else:
                print(f"[!] Creation returned {post_resp.status_code}: {post_resp.text[:300]}")

        # Run verification query
        print("\n[*] Sending test query to CropSathi AI Agent...")
        test_payload = {
            "output_type": "chat",
            "input_type": "chat",
            "input_value": "What is the best soil for tomato?",
        }
        run_resp = client.post(f"{LANGFLOW_URL}/api/v1/run/{FLOW_ID}", json=test_payload)
        if run_resp.status_code == 200:
            res_data = run_resp.json()
            try:
                outputs = res_data["outputs"][0]["outputs"][0]["results"]["message"]["data"]["text"]
                print("[+] Flow execution succeeded! Agent response:")
                print("--------------------------------------------------")
                print(outputs[:400])
                print("--------------------------------------------------")
            except Exception:
                print("[+] Execution returned 200 OK. Raw data:", str(res_data)[:200])
        else:
            print(f"[!] Test run returned status {run_resp.status_code}: {run_resp.text[:300]}")


if __name__ == "__main__":
    main()
