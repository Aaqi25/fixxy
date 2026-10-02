"""Pydantic schemas for the Misconception Taxonomy."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Misconception(BaseModel):
    """Schema representing a single controlled misconception."""

    id: str = Field(..., description="Unique identifier for the misconception.")
    short_id: str | None = Field(default=None, description="Short code, e.g. M1, M2.")
    concept: str = Field(..., description="ML concept name, e.g., 'overfitting'.")
    name: str = Field(..., description="Human-readable title of the misconception.")
    description: str = Field(..., description="Detailed description of the misunderstanding.")
    detection_examples: list[str] = Field(
        default_factory=list,
        description="Sample student responses or mistake patterns indicating this misconception.",
    )
    correct_concept: str = Field(..., description="The accurate foundational concept.")
    analogy: str = Field(..., description="Intuitive real-world analogy.")
    simple_example: str = Field(..., description="Concrete intuitive example.")
    technical_explanation: str = Field(..., description="Rigorous technical explanation.")
    hint: str = Field(..., description="Guiding hint to nudge student thinking.")
    retry_question: str = Field(..., description="Targeted retry question on the same concept.")
    transfer_question: str = Field(..., description="Transfer question testing application to a new domain.")


class MisconceptionTaxonomyData(BaseModel):
    """Container schema for the taxonomy JSON file."""

    concept: str
    version: str
    misconceptions: list[Misconception]
