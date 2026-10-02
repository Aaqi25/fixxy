"""Unit and integration tests for the FIXXY Transfer Question Engine."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.schemas.transfer import TransferRequest, TransferResponse
from app.transfer.engine import generate_transfer_question, CURATED_TRANSFER_BANK
from app.prompts.transfer import build_transfer_question_prompt


class TestCuratedTransferQuestions:
    """Test deterministic curated transfer question bank."""

    @pytest.mark.parametrize("m_id", ["M1", "M2", "M3", "M4", "M5", "M6", "UNKNOWN"])
    def test_curated_bank_entries_have_valid_structure(self, m_id):
        entry = CURATED_TRANSFER_BANK[m_id]
        assert "concept" in entry
        assert "question" in entry
        assert len(entry["options"]) == 4
        assert "underlying_concept" in entry
        assert len(entry["underlying_concept"]) > 0

    @pytest.mark.asyncio
    async def test_generate_transfer_question_m1(self):
        req = TransferRequest(
            concept="overfitting",
            misconception_id="M1",
            original_question="A model achieves 100% training accuracy. Why is it failing on test data?",
        )
        res = await generate_transfer_question(req)

        assert isinstance(res, TransferResponse)
        assert res.concept == "overfitting"
        assert res.underlying_concept == "generalization"
        assert len(res.options) == 4
        assert "facial recognition" in res.question.lower()
        # Verify surface details changed from training accuracy to facial recognition in sunlight
        assert "sunlight" in res.question.lower()

    @pytest.mark.asyncio
    async def test_generate_transfer_canonical_id_lookup(self):
        req = TransferRequest(
            concept="overfitting",
            misconception_id="ov_more_features_always_better",
            original_question="Why not add 1000 features?",
        )
        res = await generate_transfer_question(req)

        assert isinstance(res, TransferResponse)
        assert res.underlying_concept == "curse of dimensionality"
        assert len(res.options) == 4
        assert "gene" in res.question.lower()

    @pytest.mark.asyncio
    async def test_generate_transfer_unknown_misconception(self):
        req = TransferRequest(
            concept="overfitting",
            misconception_id="UNKNOWN",
        )
        res = await generate_transfer_question(req)

        assert isinstance(res, TransferResponse)
        assert res.underlying_concept == "generalization error and evaluation"
        assert len(res.options) == 4


class TestGeminiFallbackTransfer:
    """Test dynamic transfer question generation fallback with Gemini."""

    def test_build_transfer_question_prompt(self):
        prompt = build_transfer_question_prompt(
            concept="regularization",
            misconception_id="UNKNOWN",
            original_question="What does weight decay do?",
        )
        assert "regularization" in prompt
        assert "Transfer Question" in prompt
        assert "Multiple-Choice Options" in prompt
        assert "underlying_concept" in prompt

    @pytest.mark.asyncio
    async def test_gemini_fallback_for_custom_concept(self, mock_gemini_client):
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "question": "A hospital deploys an algorithm to predict sepsis in ICU patients. On test data from a different hospital wing with older sensors, the error spikes. What core issue is occurring?",
            "options": [
                "The model learned sensor calibration noise rather than true physiological markers.",
                "ICU patient counts are mathematically too small for machine learning.",
                "The hospital should eliminate validation procedures.",
                "The model underfitted because training loss was too low.",
            ],
            "underlying_concept": "covariate shift and generalization",
        })
        mock_gemini_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        req = TransferRequest(
            concept="covariate_shift",
            misconception_id="custom_shift_misconception",
            original_question="Why did the ICU model fail?",
        )
        res = await generate_transfer_question(req, client=mock_gemini_client)

        assert isinstance(res, TransferResponse)
        assert res.concept == "covariate_shift"
        assert "sepsis" in res.question.lower()
        assert len(res.options) == 4
        assert res.underlying_concept == "covariate shift and generalization"
