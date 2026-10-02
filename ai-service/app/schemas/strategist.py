"""Pydantic models for the Teaching Strategy Selector."""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field, RootModel


class StrategyType(str, Enum):
    """Supported core teaching strategies."""

    ANALOGY = "analogy"
    EXAMPLE = "example"
    TECHNICAL = "technical"


# Priority order for deterministic tie-breaking and cold-start
STRATEGY_PRIORITY = [
    StrategyType.ANALOGY,
    StrategyType.EXAMPLE,
    StrategyType.TECHNICAL,
]

COLD_START_DEFAULT_STRATEGY = StrategyType.ANALOGY


# ---------------------------------------------------------------------------
# Schemas for Strategy Selection
# ---------------------------------------------------------------------------

class StrategyEffectivenessHistory(RootModel[dict[str, float]]):
    """Direct dictionary of strategy effectiveness scores, e.g. {'analogy': 0.80}."""
    root: dict[str, float] = Field(
        default_factory=dict,
        examples=[{"analogy": 0.80, "example": 0.55, "technical": 0.25}],
    )


class StrategySelectRequest(BaseModel):
    """Request to select the best teaching strategy for a student."""

    history: dict[str, float] = Field(
        default_factory=dict,
        description="Historical effectiveness scores for strategies.",
        examples=[{"analogy": 0.80, "example": 0.55, "technical": 0.25}],
    )
    concept: str | None = Field(
        default=None,
        description="Optional ML concept being taught.",
    )
    misconception_id: str | None = Field(
        default=None,
        description="Optional identified misconception ID.",
    )


class StrategySelectResponse(BaseModel):
    """Response containing the selected teaching strategy."""

    strategy: str = Field(
        ...,
        description="The chosen strategy: 'analogy', 'example', or 'technical'.",
        examples=["analogy"],
    )
    strategy_id: str | None = Field(
        default=None,
        description="Canonical strategy identifier.",
    )
    strategy_name: str | None = Field(
        default=None,
        description="Human-readable title.",
    )
    description: str | None = Field(
        default=None,
        description="Description of the teaching strategy.",
    )


# ---------------------------------------------------------------------------
# Legacy / Attempt-based Request Schema (Compatibility)
# ---------------------------------------------------------------------------

class StrategyRequest(BaseModel):
    """Attempt-based strategy request."""

    concept: str = Field(..., description="ML concept.")
    misconception_id: str = Field(..., description="Misconception ID.")
    attempt_number: int = Field(default=1, ge=1, description="Attempt number.")
    history: dict[str, float] | None = Field(
        default=None,
        description="Optional effectiveness history.",
    )


class StrategyResponse(BaseModel):
    """Legacy response schema containing strategy and metadata."""

    strategy: str = Field(default="analogy", description="Strategy name.")
    strategy_id: str = Field(..., description="Strategy ID.")
    strategy_name: str = Field(..., description="Human-readable title.")
    description: str = Field(..., description="Strategy description.")
