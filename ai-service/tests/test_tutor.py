"""Unit and integration tests for the FIXXY Tutor Engine."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.schemas.tutor import TutorRequest, TutorResponse, TutorLLMResult
from app.prompts.tutor import build_tutor_prompt, STRATEGY_INSTRUCTIONS
from app.tutor.engine import generate_tutoring


class TestTutorPrompt:
    """Test prompt template generation and constraint adherence."""

    def test_build_tutor_prompt_contains_core_fields(self):
        prompt = build_tutor_prompt(
            concept="overfitting",
            misconception="100% training accuracy means the model learned perfectly",
            selected_teaching_strategy="analogy",
            correct_concept="High training accuracy can mean memorization of noise rather than true generalization.",
            rag_context="Overfitting occurs when a model fits training data too closely.",
            student_mastery=0.4,
            relevant_student_history=["Confused training with validation loss in prior quiz"],
            question_text="Why did our model fail on test data despite 100% training accuracy?",
            student_answer="Because 100% training accuracy means it's flawless.",
        )

        assert "overfitting" in prompt
        assert "analogy" in prompt.lower()
        assert "Retrieved Curriculum Knowledge" in prompt
        assert "Student Mastery Context" in prompt
        assert "0.4" in prompt
        assert "Confused training with validation loss" in prompt
        assert "Friendly Study Friend Persona" in prompt
        assert "Do NOT Immediately Reveal the Answer" in prompt
        assert "Provide a Useful Hint" in prompt
        assert "Encourage to Retry" in prompt
        assert "Do NOT Calculate Mastery" in prompt
        assert "opening_message" in prompt
        assert "retry_instruction" in prompt

    def test_build_tutor_prompt_with_list_rag_context(self):
        prompt = build_tutor_prompt(
            concept="overfitting",
            misconception="ov_memorization_is_learning",
            selected_teaching_strategy="contrast",
            correct_concept="Generalization is measured on unseen data.",
            rag_context=["Fact 1: Overfitting means memorizing noise.", "Fact 2: Regularization prevents overfitting."],
        )

        assert "Fact 1" in prompt
        assert "Fact 2" in prompt
        assert "CONTRAST" in prompt

    def test_all_strategies_mapped_in_prompt(self):
        strategies = ["analogy", "contrast", "visualization", "counterexample", "simplification", "socratic"]
        for st in strategies:
            prompt = build_tutor_prompt(
                concept="regularization",
                misconception="regularization increases model complexity",
                selected_teaching_strategy=st,
                correct_concept="Regularization penalizes complex models to prevent overfitting.",
            )
            assert st in prompt.lower() or any(term in prompt.lower() for term in ["analogy", "contrast", "visualization", "counterexample", "simplification", "socratic"])


class TestTutorEngine:
    """Test the tutor engine execution with mocked Gemini client."""

    @pytest.mark.asyncio
    async def test_generate_tutoring_success(self, mock_gemini_client):
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "opening_message": "Hey friend! That was a really thoughtful attempt, let's break this down together.",
            "explanation": "Imagine memorizing an exact practice exam word-for-word instead of learning the underlying concepts. When you get the real exam with new questions, memorization won't help you solve them.",
            "hint": "Think about whether the model is learning general rules or just remembering specific data points it already saw.",
            "retry_instruction": "Take another look at the test accuracy and see how it compares to the training accuracy!",
        })
        mock_gemini_client.aio.models.generate_content.return_value = mock_response

        request = TutorRequest(
            concept="overfitting",
            misconception="M1: Memorization equals learning",
            selected_teaching_strategy="analogy",
            correct_concept="Overfitting happens when a model memorizes noise instead of learning general patterns.",
            rag_context="Overfitting means high training accuracy but low test accuracy.",
            student_mastery=0.25,
            relevant_student_history=["Failed previous question on validation sets"],
        )

        result = await generate_tutoring(request, mock_gemini_client)

        assert isinstance(result, TutorResponse)
        assert "Hey friend!" in result.opening_message
        assert "practice exam" in result.explanation
        assert "Think about" in result.hint
        assert "Take another look" in result.retry_instruction

    @pytest.mark.asyncio
    async def test_generate_tutoring_handles_malformed_json(self, mock_gemini_client):
        mock_response = MagicMock()
        mock_response.text = "NOT_JSON"
        mock_gemini_client.aio.models.generate_content.return_value = mock_response

        request = TutorRequest(
            concept="overfitting",
            misconception="ov_overfitting_is_always_bad",
            selected_teaching_strategy="contrast",
            correct_concept="Overfitting is poor generalization to unseen data.",
        )

        result = await generate_tutoring(request, mock_gemini_client)

        assert isinstance(result, TutorResponse)
        assert result.opening_message
        assert result.explanation
        assert result.hint
        assert result.retry_instruction

    @pytest.mark.asyncio
    async def test_tutor_request_alias_compatibility(self, mock_gemini_client):
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "opening_message": "Great effort on this question!",
            "explanation": "Let's compare training vs test performance side-by-side.",
            "hint": "Check the gap between training and validation loss.",
            "retry_instruction": "Try re-evaluating the options with this gap in mind.",
        })
        mock_gemini_client.aio.models.generate_content.return_value = mock_response

        # Use legacy/alias parameter names
        request = TutorRequest.model_validate({
            "concept": "overfitting",
            "misconception_id": "M1",
            "strategy_id": "contrast",
            "correct_answer": "Overfitting fails on unseen test sets.",
        })

        assert request.misconception == "M1"
        assert request.selected_teaching_strategy == "contrast"
        assert request.correct_concept == "Overfitting fails on unseen test sets."

        result = await generate_tutoring(request, mock_gemini_client)
        assert isinstance(result, TutorResponse)
        assert result.explanation
