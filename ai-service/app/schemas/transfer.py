"""Pydantic models for the FIXXY Transfer Question Engine."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, model_validator


class TransferRequest(BaseModel):
    """Input request for generating a transfer question."""

    concept: str = Field(..., description="The ML concept being tested, e.g. 'overfitting'.")
    misconception_id: str = Field(..., description="The diagnosed misconception ID (e.g. 'M1' or 'ov_memorization_is_learning').")
    original_question: str | None = Field(
        default=None,
        description="The original question prompt that the student attempted.",
    )

    @model_validator(mode="before")
    @classmethod
    def remap_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Allow misconception -> misconception_id
            if "misconception_id" not in data and "misconception" in data:
                data["misconception_id"] = data["misconception"]
            # Allow question -> original_question
            if "original_question" not in data and "question" in data:
                data["original_question"] = data["question"]
        return data


class TransferResponse(BaseModel):
    """Structured response containing the transfer question and options."""

    concept: str = Field(..., description="The ML concept being tested.")
    question: str = Field(
        ...,
        description="The transfer question applying the concept to a new scenario.",
    )
    options: list[str] = Field(
        ...,
        description="List of multiple-choice options.",
    )
    underlying_concept: str = Field(
        ...,
        description="The underlying theoretical concept being evaluated, e.g. 'generalization'.",
    )


class TransferLLMResult(BaseModel):
    """Internal model for Gemini structured JSON output."""

    question: str
    options: list[str] = Field(..., description="Exactly 4 multiple-choice options.")
    underlying_concept: str
