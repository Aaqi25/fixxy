"""Tests for the API endpoints."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock


class TestHealthEndpoint:
    """Test the health check."""

    def test_health_returns_200(self, test_client):
        client, _ = test_client
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestTaxonomyEndpoint:
    """Test the taxonomy info endpoint."""

    def test_get_overfitting_taxonomy(self, test_client):
        client, _ = test_client
        response = client.get("/api/v1/taxonomy/overfitting")
        assert response.status_code == 200
        data = response.json()
        assert data["concept"] == "overfitting"
        assert len(data["misconception_ids"]) == 6

    def test_unknown_concept_returns_404(self, test_client):
        client, _ = test_client
        response = client.get("/api/v1/taxonomy/nonexistent")
        assert response.status_code == 404


class TestDiagnoseEndpoint:
    """Test the POST /ai/diagnose endpoint with mocked Gemini."""

    def test_diagnose_m1_misconception(self, test_client):
        client, mock_gemini = test_client

        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "misconception_id": "M1",
            "confidence": 0.92,
            "reason": "Student assumes high training accuracy indicates true model learning.",
        })
        mock_gemini.aio.models.generate_content = AsyncMock(return_value=mock_response)

        response = client.post(
            "/ai/diagnose",
            json={
                "concept": "overfitting",
                "question": "A model gets 100% on training and 50% on test. Why?",
                "correct_answer": "It memorized training data instead of learning general rules.",
                "student_answer": "100% accuracy means it learned everything perfectly.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["misconception_id"] == "M1"
        assert data["confidence"] == 0.92
        assert "reason" in data

    def test_diagnose_unknown_when_unclear(self, test_client):
        client, mock_gemini = test_client

        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "misconception_id": "UNKNOWN",
            "confidence": 0.2,
            "reason": "Insufficient evidence.",
        })
        mock_gemini.aio.models.generate_content = AsyncMock(return_value=mock_response)

        response = client.post(
            "/ai/diagnose",
            json={
                "concept": "overfitting",
                "question": "Explain overfitting",
                "correct_answer": "Model fits noise.",
                "student_answer": "Not sure.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["misconception_id"] == "UNKNOWN"


class TestStrategyEndpoint:
    """Test the strategy selection endpoint (no Gemini needed)."""

    def test_strategy_returns_200(self, test_client):
        client, _ = test_client
        response = client.post(
            "/api/v1/strategy",
            json={
                "concept": "overfitting",
                "misconception_id": "ov_memorization_is_learning",
                "attempt_number": 1,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "strategy_id" in data
        assert "strategy_name" in data


class TestTeachEndpoint:
    """Test the POST /ai/teach endpoint with mocked Gemini."""

    def test_teach_endpoint_success(self, test_client):
        client, mock_gemini = test_client

        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "opening_message": "Hey friend, let's explore this question together!",
            "explanation": "High training accuracy just shows how well the model learned the training set, not how well it generalizes to unseen data.",
            "hint": "Think about the difference between memorizing flashcards and actually understanding the concepts.",
            "retry_instruction": "Take another look at the test performance versus training performance.",
        })
        mock_gemini.aio.models.generate_content = AsyncMock(return_value=mock_response)

        response = client.post(
            "/ai/teach",
            json={
                "concept": "overfitting",
                "misconception": "100% training accuracy means perfect model",
                "selected_teaching_strategy": "analogy",
                "correct_concept": "High training accuracy alone does not guarantee generalization to unseen test data.",
                "rag_context": "Overfitting happens when a model learns noise in the training set.",
                "student_mastery": 0.3,
                "relevant_student_history": ["Struggled with validation loss"],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["opening_message"] == "Hey friend, let's explore this question together!"
        assert "High training accuracy" in data["explanation"]
        assert "flashcards" in data["hint"]
        assert "retry_instruction" in data


class TestTransferEndpoint:
    """Test the POST /ai/transfer endpoint."""

    def test_transfer_endpoint_curated_m1(self, test_client):
        client, _ = test_client
        response = client.post(
            "/ai/transfer",
            json={
                "concept": "overfitting",
                "misconception_id": "M1",
                "original_question": "A model gets 100% on training and 50% on test. Why?",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["concept"] == "overfitting"
        assert data["underlying_concept"] == "generalization"
        assert len(data["options"]) == 4
        assert "facial recognition" in data["question"].lower()

    def test_transfer_endpoint_unknown_concept(self, test_client):
        client, _ = test_client
        response = client.post(
            "/ai/transfer",
            json={
                "concept": "overfitting",
                "misconception_id": "UNKNOWN",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["options"]) == 4


class TestPipelineEndpoint:
    """Test the full pipeline endpoint."""

    def test_pipeline_rejects_correct_answers(self, test_client):
        client, _ = test_client
        response = client.post(
            "/api/v1/pipeline",
            json={
                "concept": "overfitting",
                "question_text": "test",
                "student_answer": "correct",
                "correct_answer": "correct",
                "is_correct": True,
                "attempt_number": 1,
            },
        )
        assert response.status_code == 400

    def test_pipeline_full_flow(self, test_client):
        """Full pipeline with mocked Gemini for both classify and tutor calls."""
        client, mock_gemini = test_client

        classify_response = MagicMock()
        classify_response.text = json.dumps({
            "misconception_id": "M1",
            "confidence": 0.9,
            "reason": "Student equates training accuracy with generalization.",
        })

        tutor_response = MagicMock()
        tutor_response.text = json.dumps({
            "opening_message": "Hey! Great attempt at this tricky problem.",
            "explanation": "High training accuracy doesn't guarantee good performance on new data.",
            "hint": "Think about how memorizing practice answers differs from solving new questions.",
            "retry_instruction": "Try evaluating how the model behaves on unseen test sets.",
        })

        mock_gemini.aio.models.generate_content = AsyncMock(
            side_effect=[classify_response, tutor_response]
        )

        response = client.post(
            "/api/v1/pipeline",
            json={
                "concept": "overfitting",
                "question_text": "How do you know if a model is good?",
                "student_answer": "If it has high training accuracy.",
                "correct_answer": "Compare performance on training vs validation/test data.",
                "is_correct": False,
                "attempt_number": 1,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert "misconception" in data
        assert "strategy" in data
        assert "tutor" in data
        assert data["misconception"]["misconception_id"] == "M1"
        assert data["strategy"]["strategy_id"]
        assert data["tutor"]["explanation"]
        assert data["tutor"]["opening_message"]
        assert data["tutor"]["hint"]
        assert data["tutor"]["retry_instruction"]
