"""Integration tests for FIXXY's complete intervention pipeline (POST /ai/intervene)."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from google.genai.errors import APIError


class TestInterventionPipeline:
    """Test the full intervention pipeline orchestration."""

    def test_successful_m1_flow(self, test_client):
        """1. Test successful M1 misconception diagnosis, strategy selection, and tutoring flow."""
        client, mock_gemini = test_client

        # Mock Classifier LLM response
        classifier_output = MagicMock()
        classifier_output.text = json.dumps({
            "misconception_id": "M1",
            "confidence": 0.92,
            "reason": "Student assumes 100% training accuracy indicates true general model learning.",
        })

        # Mock Tutor LLM response
        tutor_output = MagicMock()
        tutor_output.text = json.dumps({
            "opening_message": "Hey there! That's a super common assumption when first checking training metrics.",
            "explanation": "Think of it like memorizing answers to last semester's practice test: you score 100% on the practice, but struggle when new questions appear on the real exam.",
            "hint": "Compare how well the model does on the training set versus the unseen test set.",
            "retry_instruction": "Reflect on what the gap between training and test accuracy tells us and give it another shot!",
        })

        mock_gemini.aio.models.generate_content = AsyncMock(
            side_effect=[classifier_output, tutor_output]
        )

        payload = {
            "concept": "overfitting",
            "question": "A model achieves 100% training accuracy but 50% test accuracy. Why?",
            "correct_answer": "It memorized the training data noise instead of learning generalizable patterns.",
            "student_answer": "100% accuracy means it learned the task perfectly.",
            "student_context": {
                "mastery": 42,
                "strategy_scores": {
                    "analogy": 0.80,
                    "example": 0.55,
                    "technical": 0.25,
                },
            },
        }

        response = client.post("/ai/intervene", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["misconception_id"] == "M1"
        assert data["confidence"] == 0.92
        assert data["strategy"] == "analogy"  # Highest score 0.80
        assert "super common assumption" in data["opening_message"]
        assert "memorizing answers" in data["explanation"]
        assert "Compare how well" in data["hint"]
        assert "Reflect on what" in data["retry_instruction"]

    def test_unknown_flow(self, test_client):
        """2. Test UNKNOWN misconception flow with safe fallback and no invented taxonomy IDs."""
        client, mock_gemini = test_client

        classifier_output = MagicMock()
        classifier_output.text = json.dumps({
            "misconception_id": "UNKNOWN",
            "confidence": 0.25,
            "reason": "Student expressed general confusion not matching specific taxonomy misconceptions.",
        })

        tutor_output = MagicMock()
        tutor_output.text = json.dumps({
            "opening_message": "No worries, machine learning concepts can feel confusing at first!",
            "explanation": "Let's step back: overfitting happens when a model learns noise in the data rather than true underlying relationships.",
            "hint": "Focus on the definition of generalization to new data.",
            "retry_instruction": "Try re-reading the question and think about what happens on new test samples.",
        })

        mock_gemini.aio.models.generate_content = AsyncMock(
            side_effect=[classifier_output, tutor_output]
        )

        payload = {
            "concept": "overfitting",
            "question": "Explain why test error increases during overfitting.",
            "correct_answer": "Because the model fits training noise that doesn't exist in test data.",
            "student_answer": "I don't really know, maybe the data is broken.",
            "student_context": {
                "mastery": 15,
                "strategy_scores": {
                    "technical": 0.90,
                },
            },
        }

        response = client.post("/ai/intervene", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["misconception_id"] == "UNKNOWN"
        assert data["confidence"] == 0.25
        assert data["strategy"] == "technical"
        assert data["opening_message"]
        assert data["explanation"]
        assert data["hint"]
        assert data["retry_instruction"]

    def test_dependency_failure_flow(self, test_client):
        """3. Test dependency failure handling when Gemini API fails."""
        client, mock_gemini = test_client

        mock_gemini.aio.models.generate_content = AsyncMock(
            side_effect=APIError(503, {"error": "Gemini upstream service timeout"})
        )

        payload = {
            "concept": "overfitting",
            "question": "What is overfitting?",
            "correct_answer": "Model fits training data too closely.",
            "student_answer": "Model fits data poorly.",
        }

        response = client.post("/ai/intervene", json=payload)
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "gemini" in data["detail"].lower() or "failed" in data["detail"].lower()

    def test_intervene_validation_error(self, test_client):
        """Test validation failure on missing required fields."""
        client, _ = test_client

        # Missing 'student_answer' and 'correct_answer'
        payload = {
            "concept": "overfitting",
            "question": "What is overfitting?",
        }

        response = client.post("/ai/intervene", json=payload)
        assert response.status_code == 422
