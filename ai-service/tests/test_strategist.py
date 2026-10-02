"""Unit tests for FIXXY's Deterministic Teaching Strategy Selector."""

import pytest
from app.schemas.strategist import (
    StrategyType,
    StrategySelectRequest,
    StrategySelectResponse,
    COLD_START_DEFAULT_STRATEGY,
    STRATEGY_PRIORITY,
)
from app.strategist.engine import select_strategy, select_strategy_from_history


class TestDeterministicStrategySelection:
    """Test deterministic strategy selection rules."""

    def test_highest_performing_strategy_analogy(self):
        """Should select analogy when it has the highest score."""
        history = {
            "analogy": 0.80,
            "example": 0.55,
            "technical": 0.25,
        }
        chosen = select_strategy_from_history(history)
        assert chosen == StrategyType.ANALOGY
        assert chosen.value == "analogy"

    def test_highest_performing_strategy_example(self):
        """Should select example when it has the highest score."""
        history = {
            "analogy": 0.30,
            "example": 0.95,
            "technical": 0.40,
        }
        chosen = select_strategy_from_history(history)
        assert chosen == StrategyType.EXAMPLE
        assert chosen.value == "example"

    def test_highest_performing_strategy_technical(self):
        """Should select technical when it has the highest score."""
        history = {
            "analogy": 0.10,
            "example": 0.45,
            "technical": 0.88,
        }
        chosen = select_strategy_from_history(history)
        assert chosen == StrategyType.TECHNICAL
        assert chosen.value == "technical"

    def test_cold_start_default_on_empty_history(self):
        """When history is empty, return cold-start default (analogy)."""
        assert select_strategy_from_history({}) == COLD_START_DEFAULT_STRATEGY
        assert select_strategy_from_history(None) == COLD_START_DEFAULT_STRATEGY

    def test_tie_breaking_all_equal(self):
        """When all scores are tied, use priority order (analogy > example > technical)."""
        history = {
            "analogy": 0.70,
            "example": 0.70,
            "technical": 0.70,
        }
        chosen = select_strategy_from_history(history)
        assert chosen == StrategyType.ANALOGY

    def test_tie_breaking_example_vs_technical(self):
        """When example and technical are tied as top score, choose example."""
        history = {
            "analogy": 0.20,
            "example": 0.85,
            "technical": 0.85,
        }
        chosen = select_strategy_from_history(history)
        assert chosen == StrategyType.EXAMPLE

    def test_partial_history(self):
        """Should pick the available strategy if only one or two are present."""
        assert select_strategy_from_history({"technical": 0.65}) == StrategyType.TECHNICAL
        assert select_strategy_from_history({"example": 0.50}) == StrategyType.EXAMPLE

    def test_unknown_keys_in_history_ignored(self):
        """Unknown strategy keys are ignored; valid ones are scored."""
        history = {
            "unknown_magic_strategy": 1.0,
            "technical": 0.40,
        }
        assert select_strategy_from_history(history) == StrategyType.TECHNICAL

    def test_only_invalid_keys_returns_cold_start(self):
        """If history only contains unrecognized keys, fall back to cold-start default."""
        history = {
            "hallucinated_strategy": 0.99,
            "unsupported_method": 0.80,
        }
        assert select_strategy_from_history(history) == COLD_START_DEFAULT_STRATEGY


class TestStrategySelectorEntryPoints:
    """Test Pydantic model schemas and entry point functions."""

    def test_select_strategy_with_pydantic_request(self):
        request = StrategySelectRequest(
            history={"analogy": 0.80, "example": 0.55, "technical": 0.25},
            concept="overfitting",
            misconception_id="M1",
        )
        response = select_strategy(request)
        assert isinstance(response, StrategySelectResponse)
        assert response.strategy == "analogy"
        assert response.strategy_name is not None
        assert response.description is not None

    def test_select_strategy_with_raw_dict(self):
        raw_dict = {"example": 0.90, "technical": 0.30}
        response = select_strategy(raw_dict)
        assert response.strategy == "example"

    def test_select_strategy_with_empty_dict(self):
        response = select_strategy({})
        assert response.strategy == "analogy"

    def test_strategy_priority_completeness(self):
        """Verify all supported StrategyType values are in STRATEGY_PRIORITY."""
        assert len(STRATEGY_PRIORITY) == 3
        assert StrategyType.ANALOGY in STRATEGY_PRIORITY
        assert StrategyType.EXAMPLE in STRATEGY_PRIORITY
        assert StrategyType.TECHNICAL in STRATEGY_PRIORITY
