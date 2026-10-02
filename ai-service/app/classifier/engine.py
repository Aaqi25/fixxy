"""
Misconception Classifier Engine for FIXXY.

Uses Google GenAI SDK with structured output to diagnose misconceptions
strictly constrained to FIXXY's controlled taxonomy.
"""

from __future__ import annotations

import json
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import settings
from app.prompts.classifier import build_diagnosis_prompt
from app.schemas.classifier import (
    DiagnosisRequest,
    DiagnosisResponse,
    DiagnosisLLMResult,
)
from app.taxonomy.service import (
    TaxonomyService,
    get_taxonomy_service,
    UNKNOWN_MISCONCEPTION_ID,
)


async def classify_misconception(
    request: DiagnosisRequest,
    client: genai.Client,
    taxonomy_service: TaxonomyService | None = None,
) -> DiagnosisResponse:
    """
    Classify a student's misconception using Gemini structured output.

    Guarantees:
    1. Returns ONLY IDs from the controlled taxonomy (e.g. M1..M6) or UNKNOWN.
    2. Never invents categories.
    3. Handles malformed/invalid output safely by falling back to UNKNOWN.
    4. Clamps confidence to [0.0, 1.0].
    """
    taxonomy = taxonomy_service or get_taxonomy_service()
    misconceptions = taxonomy.get_misconceptions_for_concept(request.concept)

    # If the concept is not found in taxonomy, return UNKNOWN safely
    if not misconceptions:
        return DiagnosisResponse(
            misconception_id=UNKNOWN_MISCONCEPTION_ID,
            confidence=0.0,
            reason=f"No taxonomy defined for concept '{request.concept}'.",
        )

    prompt = build_diagnosis_prompt(
        concept=request.concept,
        question=request.question,
        correct_answer=request.correct_answer,
        student_answer=request.student_answer,
        misconceptions=misconceptions,
    )

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DiagnosisLLMResult,
                temperature=0.1,
            ),
        )

        response_text = response.text if hasattr(response, "text") else str(response)
        if not response_text:
            return DiagnosisResponse(
                misconception_id=UNKNOWN_MISCONCEPTION_ID,
                confidence=0.0,
                reason="Model returned an empty response.",
            )

        # Parse JSON
        parsed_json = json.loads(response_text)
        raw_result = DiagnosisLLMResult.model_validate(parsed_json)

        # Validate ID strictly against taxonomy
        validated_id = taxonomy.validate_misconception_id(raw_result.misconception_id)
        # Ensure canonical short_id format (e.g. M1..M6 or UNKNOWN)
        if validated_id != UNKNOWN_MISCONCEPTION_ID:
            matched = taxonomy.get_misconception_by_id(validated_id)
            if matched and matched.short_id:
                validated_id = matched.short_id

        # Clamp confidence
        clamped_confidence = max(0.0, min(1.0, float(raw_result.confidence)))

        return DiagnosisResponse(
            misconception_id=validated_id,
            confidence=round(clamped_confidence, 2),
            reason=raw_result.reason.strip() or "Diagnosed from student answer pattern.",
        )

    except (json.JSONDecodeError, ValueError, KeyError) as parse_err:
        # Gracefully handle malformed or unexpected model output
        return DiagnosisResponse(
            misconception_id=UNKNOWN_MISCONCEPTION_ID,
            confidence=0.0,
            reason=f"Failed to parse structured model response: {parse_err}",
        )
    except APIError as api_err:
        raise api_err
    except Exception as exc:
        return DiagnosisResponse(
            misconception_id=UNKNOWN_MISCONCEPTION_ID,
            confidence=0.0,
            reason=f"Classification error: {exc}",
        )
