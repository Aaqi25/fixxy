"""Manual verification script for Task 7 — FIXXY's complete intervention pipeline."""

import json
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_gemini_client
from app.schemas.intervention import InterveneRequest, InterveneResponse


def run_manual_test():
    print("=== TASK 7: FIXXY INTERVENTION PIPELINE VERIFICATION ===\n")

    # Define realistic intervention payload
    payload = {
        "concept": "overfitting",
        "question": "Why did our deep neural network achieve 99.8% training accuracy but only 52% test accuracy?",
        "correct_answer": "The network memorized training noise and specific details instead of learning generalized patterns.",
        "student_answer": "Because 99.8% training accuracy proves the model learned the underlying function almost perfectly.",
        "student_context": {
            "mastery": 42,
            "strategy_scores": {
                "analogy": 0.80,
                "example": 0.55,
                "technical": 0.25,
            },
        },
    }

    print("[1] Validating Input Request Schema...")
    req = InterveneRequest.model_validate(payload)
    print(f"    - Concept: {req.concept}")
    print(f"    - Mastery: {req.student_context.mastery}%")
    print(f"    - Top Strategy Score: analogy ({req.student_context.strategy_scores['analogy']})")
    print("    -> Schema validation SUCCESS!\n")

    print("[2] Setting up mock Gemini for classifier & tutor stages...")
    mock_client = MagicMock()
    mock_client.aio = MagicMock()
    mock_client.aio.models = MagicMock()

    classifier_mock = MagicMock()
    classifier_mock.text = json.dumps({
        "misconception_id": "M1",
        "confidence": 0.92,
        "reason": "Student assumes high training accuracy indicates true model learning rather than memorization.",
    })

    tutor_mock = MagicMock()
    tutor_mock.text = json.dumps({
        "opening_message": "Hey friend! It's really easy to see 99.8% and think the job is done, but let's look closer.",
        "explanation": "Imagine memorizing an entire answer key before an exam. You will get 100% on that exact test, but when given a new test with different numbers, memorization falls apart because the model memorized the noise rather than learning the underlying concepts.",
        "hint": "Think about why the test score is 52% despite the 99.8% training score.",
        "retry_instruction": "Try explaining what the massive gap between training accuracy and test accuracy indicates.",
    })

    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=[classifier_mock, tutor_mock]
    )

    print("[3] Sending POST /ai/intervene request to FastAPI application...")
    app.dependency_overrides[get_gemini_client] = lambda: mock_client

    with TestClient(app) as client:
        res = client.post("/ai/intervene", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()

        print("\n[4] Received Intervention Response:")
        print(f"    - misconception_id : {data['misconception_id']}")
        print(f"    - confidence       : {data['confidence']}")
        print(f"    - strategy         : {data['strategy']}")
        print(f"    - opening_message  : {data['opening_message']}")
        print(f"    - explanation      : {data['explanation']}")
        print(f"    - hint             : {data['hint']}")
        print(f"    - retry_instruction: {data['retry_instruction']}")

        # Validate structure against response model
        response_model = InterveneResponse.model_validate(data)
        assert response_model.misconception_id == "M1"
        assert response_model.strategy == "analogy"

    app.dependency_overrides.clear()
    print("\n=== INTERVENTION PIPELINE VERIFICATION PASSED SUCCESSFULLY ===")


if __name__ == "__main__":
    run_manual_test()
