"""Tests for the interactive FIXXY Tutor Chat engine and endpoint."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.tutor import TutorChatRequest, ChatMessage
from app.tutor.chat import chat_with_tutor, _generate_fallback_response


@pytest.mark.asyncio
async def test_fallback_chat_responses():
    """Verify context-aware fallback handles various student questions."""
    req_concept = TutorChatRequest(
        concept="overfitting",
        message="Why is high training accuracy not enough?",
        misconception_id="OVERFIT_M1",
        conversation=[],
    )
    fallback = _generate_fallback_response(req_concept)
    assert "overfitting" in fallback.lower() or "training" in fallback.lower()

    # Simplification test
    req_simpler = TutorChatRequest(
        concept="overfitting",
        message="Can you explain simpler? I still don't understand.",
        conversation=[],
    )
    fallback_simpler = _generate_fallback_response(req_simpler)
    assert "memoriz" in fallback_simpler.lower()

    # Anti-leak test
    req_leak = TutorChatRequest(
        concept="overfitting",
        message="What is the answer? Just tell me the answer.",
        conversation=[],
    )
    fallback_leak = _generate_fallback_response(req_leak)
    assert "reason it out together" in fallback_leak.lower()


@pytest.mark.asyncio
async def test_chat_endpoint_contract():
    """Test POST /ai/chat endpoint response contract."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "concept": "overfitting",
            "question": "A model achieves 99.8% train accuracy but only 52% test accuracy. Why?",
            "student_answer": "100% training accuracy means the model learned perfectly.",
            "correct_answer": "The model has overfit the training data and failed to generalize.",
            "misconception_id": "OVERFIT_M1",
            "strategy": "analogy",
            "conversation": [],
            "message": "Why is high training accuracy bad?",
        }
        res = await ac.post("/ai/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "response" in data
        assert len(data["response"]) > 10
        assert data["concept"] == "overfitting"
