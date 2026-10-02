"""Unit tests for FIXXY's Gemini Misconception Classifier."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.classifier.engine import classify_misconception
from app.schemas.classifier import DiagnosisRequest, DiagnosisResponse
from app.taxonomy.service import get_taxonomy_service, UNKNOWN_MISCONCEPTION_ID
from app.dependencies import LLMService, get_gemini_client


def _make_mock_response(misconception_id: str, confidence: float, reason: str):
    """Helper to mock a Gemini generate_content response."""
    response = MagicMock()
    response.text = json.dumps({
        "misconception_id": misconception_id,
        "confidence": confidence,
        "reason": reason,
    })
    return response


class TestClassifierDiagnosis:
    """Test classification engine with mocked Gemini SDK."""

    @pytest.mark.asyncio
    async def test_valid_misconception_m1(self, mock_gemini_client):
        """Test diagnosing misconception M1 (ov_memorization_is_learning)."""
        mock_gemini_client.aio.models.generate_content = AsyncMock(
            return_value=_make_mock_response(
                "M1",
                0.92,
                "Student confuses high training accuracy with true model learning.",
            )
        )

        request = DiagnosisRequest(
            concept="overfitting",
            question="A model achieves 99% training accuracy and 50% test accuracy. Is it performing well?",
            correct_answer="No, it is overfitting and failing to generalize.",
            student_answer="Yes, 99% training accuracy means it learned the patterns completely.",
        )
        response = await classify_misconception(request, mock_gemini_client)

        assert isinstance(response, DiagnosisResponse)
        assert response.misconception_id == "M1"
        assert response.confidence == 0.92
        assert "training accuracy" in response.reason.lower()

    @pytest.mark.asyncio
    async def test_valid_misconception_canonical_id_mapped_to_short_id(self, mock_gemini_client):
        """If model returns the full ID 'ov_more_features_always_better', it maps to 'M2'."""
        mock_gemini_client.aio.models.generate_content = AsyncMock(
            return_value=_make_mock_response(
                "ov_more_features_always_better",
                0.88,
                "Student believes adding every possible feature improves performance.",
            )
        )

        request = DiagnosisRequest(
            concept="overfitting",
            question="Why shouldn't we add all 5,000 available features to a dataset of 100 rows?",
            correct_answer="It leads to high dimensionality, noise fitting, and overfitting.",
            student_answer="More features always give more data and make the model smarter.",
        )
        response = await classify_misconception(request, mock_gemini_client)

        assert response.misconception_id == "M2"
        assert response.confidence == 0.88

    @pytest.mark.asyncio
    async def test_unknown_misconception(self, mock_gemini_client):
        """When model determines no known misconception matches, returns UNKNOWN."""
        mock_gemini_client.aio.models.generate_content = AsyncMock(
            return_value=_make_mock_response(
                "UNKNOWN",
                0.40,
                "Student gave a vague non-sequitur unrelated to known misconceptions.",
            )
        )

        request = DiagnosisRequest(
            concept="overfitting",
            question="What is overfitting?",
            correct_answer="When a model learns noise in training data instead of general patterns.",
            student_answer="I like Python programming.",
        )
        response = await classify_misconception(request, mock_gemini_client)

        assert response.misconception_id == UNKNOWN_MISCONCEPTION_ID
        assert response.confidence == 0.40

    @pytest.mark.asyncio
    async def test_invalid_model_output_falls_back_to_unknown(self, mock_gemini_client):
        """If the LLM invents a non-existent ID, it must fall back to UNKNOWN."""
        mock_gemini_client.aio.models.generate_content = AsyncMock(
            return_value=_make_mock_response(
                "M99_HALLUCINATED_CATEGORY",
                0.95,
                "Invented category.",
            )
        )

        request = DiagnosisRequest(
            concept="overfitting",
            question="What causes overfitting?",
            correct_answer="High model capacity relative to data size.",
            student_answer="Bad vibes during training.",
        )
        response = await classify_misconception(request, mock_gemini_client)

        assert response.misconception_id == UNKNOWN_MISCONCEPTION_ID

    @pytest.mark.asyncio
    async def test_malformed_json_response_handled_gracefully(self, mock_gemini_client):
        """If the model returns malformed non-JSON, handle safely without crashing."""
        malformed = MagicMock()
        malformed.text = "NOT_A_VALID_JSON_OBJECT {"
        mock_gemini_client.aio.models.generate_content = AsyncMock(return_value=malformed)

        request = DiagnosisRequest(
            concept="overfitting",
            question="Test question",
            correct_answer="Correct",
            student_answer="Student answer",
        )
        response = await classify_misconception(request, mock_gemini_client)

        assert response.misconception_id == UNKNOWN_MISCONCEPTION_ID
        assert response.confidence == 0.0
        assert "failed to parse" in response.reason.lower()

    @pytest.mark.asyncio
    async def test_confidence_validation_and_clamping(self, mock_gemini_client):
        """Confidence outside [0, 1] must be clamped."""
        mock_gemini_client.aio.models.generate_content = AsyncMock(
            return_value=_make_mock_response(
                "M3",
                1.75,  # Above 1.0
                "Very confident.",
            )
        )

        request = DiagnosisRequest(
            concept="overfitting",
            question="Can large datasets overfit?",
            correct_answer="Yes, if model capacity is sufficiently high.",
            student_answer="No, big data makes overfitting impossible.",
        )
        response = await classify_misconception(request, mock_gemini_client)

        assert response.misconception_id == "M3"
        assert response.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_unsupported_concept_returns_unknown(self, mock_gemini_client):
        """A concept without any taxonomy entries returns UNKNOWN safely."""
        request = DiagnosisRequest(
            concept="reinforcement_learning_unsupported",
            question="What is Q-learning?",
            correct_answer="Value-based RL",
            student_answer="Policy gradients",
        )
        response = await classify_misconception(request, mock_gemini_client)

        assert response.misconception_id == UNKNOWN_MISCONCEPTION_ID
        assert response.confidence == 0.0


class TestMissingAPIKey:
    """Test behavior when GEMINI_API_KEY is missing."""

    def test_missing_api_key_raises_http_500(self):
        llm = LLMService(api_key="")
        with pytest.raises(Exception) as exc_info:
            _ = llm.client
        assert "GEMINI_API_KEY is not configured" in str(exc_info.value)
