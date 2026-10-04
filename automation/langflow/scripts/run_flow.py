"""
scripts/run_flow.py - Interactive CLI Chat with CropSathi AI Agent.

Allows developers to chat directly with the agent from their terminal.

Usage:
    python scripts/run_flow.py
"""

import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))
load_dotenv(base_dir / ".env")

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agent.crop_sathi import CropSathiAgent


async def main():
    agent = CropSathiAgent()
    print("==================================================")
    print(" CropSathi AI Agent - Interactive Console")
    print(" Type 'exit' or 'quit' to terminate.")
    print(" Type 'lang:hi' or 'lang:mr' to change language.")
    print("==================================================")

    current_lang = "en"

    while True:
        try:
            user_input = input(f"\n[You ({current_lang})]> ").strip()
            if not user_input:
                continue

            if user_input.lower() in ["exit", "quit", "q"]:
                print("Goodbye!")
                break

            if user_input.startswith("lang:"):
                current_lang = user_input.split(":", 1)[1].strip()
                print(f"[*] Language set to: {current_lang}")
                continue

            print("[*] Thinking...")
            result = await agent.chat(message=user_input, language=current_lang)
            source = result.get("source", "unknown")
            print(f"\n[CropSathi ({source})]:\n{result['response']}")

        except (KeyboardInterrupt, EOFError):
            print("\nSession ended.")
            break


if __name__ == "__main__":
    asyncio.run(main())
