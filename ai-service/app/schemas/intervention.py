"""Pydantic models for the FIXXY Intervention Pipeline."""

from __future__ import annotations

from pydantic import BaseModel, Field


class StudentContext(BaseModel):
    """Student context including mastery level and strategy effectiveness scores."""

    mastery: float | int | None = Field(
        default=None,
        description="Student's current mastery percentage or level.",
    )
    strategy_scores: dict[str, float] = Field(
        default_factory=dict,
        description="Historical effectiveness scores for strategies, e.g. {'analogy': 0.80, 'example': 0.55, 'technical': 0.25}.",
        examples=[{"analogy": 0.80, "example": 0.55, "technical": 0.25}],
    )


class InterveneRequest(BaseModel):
    """Input request for FIXXY's complete intervention pipeline."""

    concept: str = Field(..., description="The ML concept being studied, e.g. 'overfitting'.")
    question: str = Field(..., description="The question presented to the student.")
    correct_answer: str = Field(..., description="The correct answer to the question.")
    student_answer: str = Field(..., description="The student's submitted incorrect answer.")
    student_context: StudentContext | None = Field(
        default=None,
        description="Student learning context including strategy history.",
    )


class InterveneResponse(BaseModel):
    """Complete structured intervention response."""

    misconception_id: str = Field(
        ...,
        description="Classified misconception ID (e.g. 'M1' or 'UNKNOWN').",
    )
    confidence: float = Field(
        ...,
        description="Confidence score [0.0, 1.0] of the classification.",
    )
    strategy: str = Field(
        ...,
        description="Selected teaching strategy (e.g. 'analogy', 'example', 'technical').",
    )
    opening_message: str = Field(
        ...,
        description="Friendly study-friend greeting acknowledging the student.",
    )
    explanation: str = Field(
        ...,
        description="Targeted explanation addressing the misconception using the selected strategy.",
    )
    hint: str = Field(
        ...,
        description="Helpful hint guiding the student towards the correct reasoning.",
    )
    retry_instruction: str = Field(
        ...,
        description="Encouraging instruction inviting the student to retry.",
    )
