"""
Live evaluation script for FIXXY Misconception Classification using real Gemini API.

Run this script when GEMINI_API_KEY is available in the environment:
    python tests/evaluation/live_eval.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from google import genai
from app.config import settings
from tests.evaluation.runner import run_evaluation, load_evaluation_dataset


async def main():
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY is not set. Please export GEMINI_API_KEY to run live evaluation.")
        sys.exit(1)

    print("Initializing Gemini client...")
    client = genai.Client(api_key=api_key)

    print(f"Loading benchmark dataset from dataset.json...")
    cases = load_evaluation_dataset()
    print(f"Loaded {len(cases)} evaluation cases.")
    print("Running classification evaluation against Gemini...")

    report = await run_evaluation(client=client, cases=cases)

    print("\n" + "=" * 40)
    print(report.format_text())
    print("=" * 40 + "\n")

    # Print breakdown of any misclassifications
    misclassified = [r for r in report.results if not r.is_correct]
    if misclassified:
        print(f"Misclassified cases ({len(misclassified)}):")
        for m in misclassified:
            print(f"  - [{m.case_id}] Expected {m.expected_id}, Predicted {m.predicted_id} (conf: {m.confidence})")
            print(f"    Reason: {m.reason}")
    else:
        print("All cases classified with 100% precision!")


if __name__ == "__main__":
    asyncio.run(main())
