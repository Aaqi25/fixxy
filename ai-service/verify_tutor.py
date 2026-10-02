"""Manual verification script for FIXXY Tutor Engine — Overfitting Example."""

import json
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_gemini_client
from app.schemas.tutor import TutorRequest, TutorResponse
from app.prompts.tutor import build_tutor_prompt
from app.tutor.engine import generate_tutoring


def run_verification():
    print("=== FIXXY Tutor Engine Verification: Overfitting Example ===\n")

    # Step 1: Define Overfitting scenario inputs
    overfitting_payload = {
        "concept": "overfitting",
        "misconception": "100% training accuracy means the model learned the dataset perfectly and is ready for production",
        "selected_teaching_strategy": "analogy",
        "correct_concept": "High training accuracy with low validation accuracy indicates the model memorized noise rather than generalizing to unseen data.",
        "rag_context": (
            "Overfitting occurs when an algorithm models the training data too well, "
            "capturing noise along with the underlying pattern. This causes high variance and poor generalizability."
        ),
        "student_mastery": 0.35,
        "relevant_student_history": [
            "Previous attempt confused training accuracy with test accuracy on decision trees."
        ],
        "question_text": "A decision tree model achieves 100% accuracy on the training set but 55% on the test set. What is happening?",
        "student_answer": "The model has mastered the task and is completely accurate.",
    }

    # Step 2: Test Schema Parsing
    print("[1] Testing TutorRequest schema parsing...")
    req = TutorRequest.model_validate(overfitting_payload)
    print(f"    - Concept: {req.concept}")
    print(f"    - Misconception: {req.misconception[:50]}...")
    print(f"    - Strategy: {req.selected_teaching_strategy}")
    print(f"    - Correct Concept: {req.correct_concept[:50]}...")
    print("    -> Schema parsing SUCCESS!\n")

    # Step 3: Test Prompt Generation
    print("[2] Testing Prompt Generation...")
    prompt = build_tutor_prompt(
        concept=req.concept,
        misconception=req.misconception,
        selected_teaching_strategy=req.selected_teaching_strategy,
        correct_concept=req.correct_concept,
        rag_context=req.rag_context,
        student_mastery=req.student_mastery,
        relevant_student_history=req.relevant_student_history,
        question_text=req.question_text,
        student_answer=req.student_answer,
    )
    print("    Prompt Preview (first 400 chars):")
    print("    " + prompt[:400].replace("\n", "\n    "))
    print("    ...\n    -> Prompt generation SUCCESS!\n")

    # Step 4: Test Engine Execution with Mocked Gemini
    print("[3] Testing Engine Execution via Mocked Gemini...")
    mock_client = MagicMock()
    mock_client.aio = MagicMock()
    mock_client.aio.models = MagicMock()

    mock_llm_output = {
        "opening_message": "Hey there! That's a super common trap when first looking at accuracy numbers.",
        "explanation": "Think of it like memorizing every exact question and answer on last year's practice test. You'll score 100% on the practice test, but when the real exam has new questions, you won't know how to solve them because you only memorized rather than learning the core principles.",
        "hint": "Consider why there is a large gap between the 100% training score and the 55% test score.",
        "retry_instruction": "Take another look at what happens when the model meets new, unseen data, and try explaining the issue again!",
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(mock_llm_output)
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

    # Step 5: Test API Endpoint POST /ai/teach
    print("[4] Testing POST /ai/teach via FastAPI TestClient...")
    app.dependency_overrides[get_gemini_client] = lambda: mock_client

    with TestClient(app) as client:
        res = client.post("/ai/teach", json=overfitting_payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print("    Response JSON:")
        print(f"    - opening_message: {data['opening_message']}")
        print(f"    - explanation: {data['explanation']}")
        print(f"    - hint: {data['hint']}")
        print(f"    - retry_instruction: {data['retry_instruction']}")

    app.dependency_overrides.clear()
    print("\n=== ALL MANUAL VERIFICATIONS COMPLETED SUCCESSFULLY ===")


if __name__ == "__main__":
    run_verification()
