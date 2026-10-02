"""Pydantic models for the Misconception Classifier."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# API request / response for /ai/diagnose
# ---------------------------------------------------------------------------

class DiagnosisRequest(BaseModel):
    """Request to classify the misconception behind a student's answer."""

    concept: str = Field(
        ...,
        description="The ML concept being tested, e.g. 'overfitting'.",
        examples=["overfitting"],
    )
    question: str = Field(
        ...,
        description="The question presented to the student.",
        examples=["How can you tell if a machine learning model is overfitting?"],
    )
    correct_answer: str = Field(
        ...,
        description="The correct answer to the question.",
        examples=["When validation loss starts increasing while training loss continues to decrease."],
    )
    student_answer: str = Field(
        ...,
        description="The student's submitted answer.",
        examples=["A model is good if its training accuracy is 99%."],
    )


class DiagnosisResponse(BaseModel):
    """Response returned from the misconception classifier."""

    misconception_id: str = Field(
        ...,
        description="Identified misconception ID from the controlled taxonomy (e.g. M1, M2... or UNKNOWN).",
        examples=["M1"],
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0.",
        examples=[0.92],
    )
    reason: str = Field(
        ...,
        description="Concise rationale for why this misconception was selected.",
        examples=["The student equates high training accuracy with generalization ability."],
    )

    @field_validator("confidence")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        """Ensure confidence is strictly clamped between 0.0 and 1.0."""
        return max(0.0, min(1.0, round(float(v), 3)))


# ---------------------------------------------------------------------------
# Internal schema for Gemini structured JSON output
# ---------------------------------------------------------------------------

class DiagnosisLLMResult(BaseModel):
    """Schema provided to Gemini for structured JSON generation."""

    misconception_id: str = Field(
        ...,
        description="Exactly one ID from the allowed list: M1, M2, M3, M4, M5, M6, or UNKNOWN.",
    )
    confidence: float = Field(
        ...,
        description="Confidence score between 0.0 and 1.0.",
    )
    reason: str = Field(
        ...,
        description="Concise explanation of the diagnosed misconception.",
    )


# Backward compatibility aliases for legacy endpoints
ClassifyRequest = DiagnosisRequest
ClassifyResponse = DiagnosisResponse
ClassificationLLMResult = DiagnosisLLMResult
