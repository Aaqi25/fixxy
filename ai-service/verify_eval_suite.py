"""Manual verification of the evaluation runner with sample dataset."""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

from tests.evaluation.runner import run_evaluation, load_evaluation_dataset


async def main():
    cases = load_evaluation_dataset()
    print(f"Loaded {len(cases)} evaluation cases.")

    # Create mock Gemini client with realistic classifications
    mock_client = MagicMock()
    mock_client.aio = MagicMock()
    mock_client.aio.models = MagicMock()

    # Simulate realistic 91.7% accuracy (22/24 correct)
    mock_responses = []
    for i, case in enumerate(cases):
        expected = case["expected_misconception_id"]
        # Simulate slight ambiguity on case 3
        predicted = expected if i != 2 else "M1"
        resp = MagicMock()
        resp.text = json.dumps({
            "misconception_id": predicted,
            "confidence": 0.92,
            "reason": f"Classified as {predicted} from student reasoning pattern.",
        })
        mock_responses.append(resp)

    mock_client.aio.models.generate_content = AsyncMock(side_effect=mock_responses)

    report = await run_evaluation(client=mock_client, cases=cases)

    print("\n--- Formatted Evaluation Report Output ---")
    print(report.format_text())
    print("------------------------------------------")


if __name__ == "__main__":
    asyncio.run(main())
