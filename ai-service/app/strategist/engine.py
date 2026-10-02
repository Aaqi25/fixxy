"""
Deterministic Teaching Strategy Selector for FIXXY.

Selects the best teaching strategy based on student effectiveness history
or pedagogical heuristics without using an LLM.

Supported strategies:
- analogy
- example
- technical
"""

from __future__ import annotations

from app.schemas.strategist import (
    StrategyType,
    STRATEGY_PRIORITY,
    COLD_START_DEFAULT_STRATEGY,
    StrategySelectRequest,
    StrategySelectResponse,
    StrategyRequest,
    StrategyResponse,
)

STRATEGY_METADATA: dict[StrategyType, dict[str, str]] = {
    StrategyType.ANALOGY: {
        "name": "Real-World Analogy",
        "description": "Uses an intuitive everyday analogy to build conceptual understanding.",
    },
    StrategyType.EXAMPLE: {
        "name": "Concrete Example & Counterexample",
        "description": "Provides step-by-step concrete examples illustrating the concept.",
    },
    StrategyType.TECHNICAL: {
        "name": "Technical & Mathematical Explanation",
        "description": "Explains the underlying formal mechanism and statistical foundations.",
    },
}


def select_strategy_from_history(
    history: dict[str, float] | None = None,
) -> StrategyType:
    """
    Deterministically select the best teaching strategy given effectiveness history.

    Rules:
    1. If history is empty/missing, return the cold-start default ('analogy').
    2. Normalize and check scores for all supported strategies ('analogy', 'example', 'technical').
    3. Choose the strategy with the highest score.
    4. If scores are tied, break ties deterministically in priority order:
       analogy > example > technical.
    5. Unknown keys in history are safely ignored.
    """
    if not history:
        return COLD_START_DEFAULT_STRATEGY

    # Normalize keys to lowercase
    normalized_history: dict[str, float] = {
        k.lower().strip(): float(v) for k, v in history.items() if isinstance(v, (int, float))
    }

    # Filter for known strategies present in history
    known_scores: dict[StrategyType, float] = {}
    for strategy in STRATEGY_PRIORITY:
        val = strategy.value
        if val in normalized_history:
            known_scores[strategy] = normalized_history[val]

    # If no valid known strategy was in history, use cold-start default
    if not known_scores:
        return COLD_START_DEFAULT_STRATEGY

    # Find the maximum score among known strategies
    max_score = max(known_scores.values())

    # Find candidate strategies with the maximum score
    best_candidates = [
        strategy for strategy, score in known_scores.items() if score == max_score
    ]

    # Tie-breaking: pick the first one matching the priority order
    for strategy in STRATEGY_PRIORITY:
        if strategy in best_candidates:
            return strategy

    return COLD_START_DEFAULT_STRATEGY


def select_strategy(
    request: StrategySelectRequest | StrategyRequest | dict[str, float],
) -> StrategySelectResponse:
    """
    Main entry point for strategy selection.
    Accepts StrategySelectRequest, StrategyRequest, or a raw dictionary of history scores.
    """
    if isinstance(request, dict):
        chosen = select_strategy_from_history(request)
    elif isinstance(request, StrategySelectRequest):
        chosen = select_strategy_from_history(request.history)
    elif isinstance(request, StrategyRequest):
        if request.history:
            chosen = select_strategy_from_history(request.history)
        else:
            # Fallback rotation based on attempt number
            idx = (request.attempt_number - 1) % len(STRATEGY_PRIORITY)
            chosen = STRATEGY_PRIORITY[idx]
    else:
        chosen = COLD_START_DEFAULT_STRATEGY

    meta = STRATEGY_METADATA.get(chosen, STRATEGY_METADATA[StrategyType.ANALOGY])

    return StrategySelectResponse(
        strategy=chosen.value,
        strategy_id=chosen.value,
        strategy_name=meta["name"],
        description=meta["description"],
    )
