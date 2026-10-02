"""Manual verification script for Task 8 — FIXXY's Transfer Question Engine."""

from fastapi.testclient import TestClient
from app.main import app
from app.schemas.transfer import TransferRequest, TransferResponse


def run_verification():
    print("=== TASK 8: FIXXY TRANSFER QUESTION ENGINE VERIFICATION ===\n")

    test_cases = [
        {
            "label": "Case 1: M1 (Memorization vs Generalization)",
            "payload": {
                "concept": "overfitting",
                "misconception_id": "M1",
                "original_question": "A model achieves 100% training accuracy but 50% test accuracy. Why?",
            },
        },
        {
            "label": "Case 2: M2 (Curse of Dimensionality)",
            "payload": {
                "concept": "overfitting",
                "misconception_id": "M2",
                "original_question": "Why shouldn't we add all 10,000 features from the database?",
            },
        },
        {
            "label": "Case 3: M6 (Early Stopping & Loss Divergence)",
            "payload": {
                "concept": "overfitting",
                "misconception_id": "M6",
                "original_question": "Training loss keeps dropping, should we keep training?",
            },
        },
        {
            "label": "Case 4: UNKNOWN Misconception",
            "payload": {
                "concept": "overfitting",
                "misconception_id": "UNKNOWN",
            },
        },
    ]

    with TestClient(app) as client:
        for case in test_cases:
            print(f"--- {case['label']} ---")
            res = client.post("/ai/transfer", json=case["payload"])
            assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
            data = res.json()
            validated = TransferResponse.model_validate(data)

            print(f"Concept            : {validated.concept}")
            print(f"Underlying Concept : {validated.underlying_concept}")
            print(f"Question           : {validated.question}")
            print("Options            :")
            for i, opt in enumerate(validated.options, 1):
                print(f"  {i}. {opt}")
            print()

    print("=== ALL TRANSFER QUESTION VERIFICATIONS PASSED ===")


if __name__ == "__main__":
    run_verification()