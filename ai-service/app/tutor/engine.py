"""
FIXXY Tutor Engine — generates personalized, pedagogical tutoring responses.

Uses Gemini with structured Pydantic output. Incorporates diagnosed misconception,
selected teaching strategy, correct concept, retrieved RAG context, and student state.
"""

from __future__ import annotations

import json
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import settings
from app.schemas.tutor import (
    TutorRequest,
    TutorResponse,
    TutorLLMResult,
    EvaluateRequest,
    EvaluateResponse,
    EvaluationLLMResult,
)
from app.prompts.tutor import build_tutor_prompt, build_evaluation_prompt


async def generate_tutoring(
    request: TutorRequest,
    client: genai.Client,
) -> TutorResponse:
    """
    Generate a personalized tutoring response using Gemini structured output.

    Guarantees:
    1. Returns structured TutorResponse (opening_message, explanation, hint, retry_instruction).
    2. Grounds explanation in provided RAG context and correct concept.
    3. Employs friendly study-friend tone and selected teaching strategy.
    4. Provides actionable hint without revealing immediate answer.
    """
    prompt = build_tutor_prompt(
        concept=request.concept,
        misconception=request.misconception,
        selected_teaching_strategy=request.selected_teaching_strategy,
        correct_concept=request.correct_concept,
        rag_context=request.rag_context,
        student_mastery=request.student_mastery,
        relevant_student_history=request.relevant_student_history,
        question_text=request.question_text,
        student_answer=request.student_answer,
    )

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TutorLLMResult,
                temperature=0.7,  # Creative yet structured for teaching
            ),
        )

        response_text = response.text if hasattr(response, "text") else str(response)
        if not response_text:
            return TutorResponse(
                opening_message="Hey there! Let's take a closer look at this together.",
                explanation=f"When working with {request.concept}, it's easy to get tricked. Remember: {request.correct_concept}",
                hint="Think about what happens when the model encounters brand new data it hasn't seen during training.",
                retry_instruction="Give it another try with that in mind!",
            )

        llm_result = TutorLLMResult.model_validate_json(response_text)

        return TutorResponse(
            opening_message=llm_result.opening_message.strip(),
            explanation=llm_result.explanation.strip(),
            hint=llm_result.hint.strip(),
            retry_instruction=llm_result.retry_instruction.strip(),
        )

    except APIError as api_err:
        raise api_err
    except Exception:
        # Graceful fallback in case of JSON parse or schema mismatch
        return TutorResponse(
            opening_message="Hey! Don't worry, we can work through this ML concept together.",
            explanation=f"Here is a quick way to think about {request.concept}: {request.correct_concept}",
            hint="Consider how the model generalizes beyond its training examples.",
            retry_instruction="Take another shot at the question!",
        )


async def evaluate_understanding(
    request: EvaluateRequest,
    client: genai.Client,
) -> EvaluateResponse:
    """Evaluate whether the student understood after tutoring."""

    prompt = build_evaluation_prompt(
        concept=request.concept,
        misconception_id=request.misconception_id,
        original_question=request.original_question,
        follow_up_question=request.follow_up_question,
        student_response=request.student_response,
    )

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EvaluationLLMResult,
                temperature=0.2,  # Low creativity for evaluation
            ),
        )

        response_text = response.text if hasattr(response, "text") else str(response)
        llm_result = EvaluationLLMResult.model_validate_json(response_text)

        return EvaluateResponse(
            understood=llm_result.understood,
            feedback=llm_result.feedback,
            remaining_gap=llm_result.remaining_gap if llm_result.remaining_gap else None,
        )
    except Exception as exc:
        return EvaluateResponse(
            understood=False,
            feedback="Could not fully evaluate response. Let's review the core concept again.",
            remaining_gap=str(exc),
        )
