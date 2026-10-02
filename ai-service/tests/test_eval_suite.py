"""Unit and integration tests for the FIXXY AI Evaluation Suite."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from tests.evaluation.runner import run_evaluation, load_evaluation_dataset, EvaluationReport
from app.schemas.tutor import TutorRequest, TutorResponse, TutorLLMResult
from app.schemas.strategist import StrategySelectRequest, StrategyType
from app.strategist.engine import select_strategy
from app.tutor.engine import generate_tutoring
from app.classifier.engine import classify_misconception
from app.schemas.classifier import DiagnosisRequest


class TestEvaluationDatasetAndRunner:
    """Test the benchmark dataset loading and evaluation runner."""

    def test_load_dataset_contains_at_least_20_cases(self):
        cases = load_evaluation_dataset()
        assert len(cases) >= 20, f"Expected at least 20 cases, found {len(cases)}"
        for case in cases:
            assert "concept" in case
            assert "question" in case
            assert "correct_answer" in case
            assert "student_answer" in case
            assert "expected_misconception_id" in case
            assert case["concept"] == "overfitting"
            assert case["expected_misconception_id"] in ["M1", "M2", "M3", "M4", "M5", "M6", "UNKNOWN"]

    @pytest.mark.asyncio
    async def test_evaluation_runner_report_generation(self, mock_gemini_client):
        """Test that the evaluation runner accurately calculates accuracy and formats report."""
        cases = load_evaluation_dataset()

        # Mock responses to return the expected misconception ID for each case
        mock_responses = []
        for case in cases:
            resp = MagicMock()
            resp.text = json.dumps({
                "misconception_id": case["expected_misconception_id"],
                "confidence": 0.90,
                "reason": f"Evaluated for {case['expected_misconception_id']}.",
            })
            mock_responses.append(resp)

        mock_gemini_client.aio.models.generate_content = AsyncMock(side_effect=mock_responses)

        report = await run_evaluation(client=mock_gemini_client, cases=cases)

        assert isinstance(report, EvaluationReport)
        assert report.total_cases == len(cases)
        assert report.correct_cases == len(cases)
        assert report.accuracy_percentage == 100.0

        # Check formatted report text
        text = report.format_text()
        assert "FIXXY Misconception Evaluation" in text
        assert "Total cases: " in text
        assert "Correct: " in text
        assert "Accuracy: 100.0%" in text
        assert "M1:" in text
        assert "UNKNOWN:" in text


class TestUnknownAndMalformedEvaluationCases:
    """Test evaluation behavior on UNKNOWN and malformed response cases."""

    @pytest.mark.asyncio
    async def test_unknown_cases_evaluation(self, mock_gemini_client):
        """Verify UNKNOWN cases are classified accurately without hallucinating taxonomy categories."""
        unknown_case = {
            "concept": "overfitting",
            "question": "What causes high training loss?",
            "correct_answer": "Underfitting or high model bias.",
            "student_answer": "I do not know the answer to this question.",
            "expected_misconception_id": "UNKNOWN",
        }

        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "misconception_id": "UNKNOWN",
            "confidence": 0.15,
            "reason": "Student provided non-substantive answer.",
        })
        mock_gemini_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        report = await run_evaluation(client=mock_gemini_client, cases=[unknown_case])
        assert report.total_cases == 1
        assert report.correct_cases == 1
        assert report.accuracy_percentage == 100.0

    @pytest.mark.asyncio
    async def test_malformed_classifier_response_handled(self, mock_gemini_client):
        """Malformed LLM output falls back to UNKNOWN safely during evaluation."""
        case = {
            "concept": "overfitting",
            "question": "Sample question",
            "correct_answer": "Sample answer",
            "student_answer": "Sample student answer",
            "expected_misconception_id": "UNKNOWN",
        }

        mock_response = MagicMock()
        mock_response.text = "INVALID_NON_JSON_DATA"
        mock_gemini_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        report = await run_evaluation(client=mock_gemini_client, cases=[case])
        assert report.results[0].predicted_id == "UNKNOWN"
        assert report.results[0].is_correct is True


class TestStrategyAndTutorEvaluationIntegrations:
    """Test strategy selection and tutor schema validation across evaluated misconceptions."""

    def test_strategy_selection_across_all_eval_misconceptions(self):
        """Verify strategy selection works deterministically for all misconceptions."""
        cases = load_evaluation_dataset()
        for case in cases:
            m_id = case["expected_misconception_id"]
            res = select_strategy(
                StrategySelectRequest(
                    history={"analogy": 0.9, "example": 0.5, "technical": 0.3},
                    concept=case["concept"],
                    misconception_id=m_id,
                )
            )
            assert res.strategy == StrategyType.ANALOGY.value
            assert res.strategy_name

    @pytest.mark.asyncio
    async def test_tutor_schema_validation_across_eval_cases(self, mock_gemini_client):
        """Verify tutoring output generates valid TutorResponse matching required schema."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "opening_message": "Hey friend! Let's explore this together.",
            "explanation": "High training accuracy does not guarantee good generalization to new data.",
            "hint": "Think about memorization versus true pattern learning.",
            "retry_instruction": "Try evaluating the model on unseen test sets!",
        })
        mock_gemini_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        req = TutorRequest(
            concept="overfitting",
            misconception="M1",
            selected_teaching_strategy="analogy",
            correct_concept="Generalization to unseen test data is key.",
        )
        tutor_res = await generate_tutoring(req, mock_gemini_client)

        assert isinstance(tutor_res, TutorResponse)
        assert tutor_res.opening_message
        assert tutor_res.explanation
        assert tutor_res.hint
        assert tutor_res.retry_instruction
