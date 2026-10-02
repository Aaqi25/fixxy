"""
Controlled Misconception Taxonomy for FIXXY.

IMPORTANT: The LLM must NEVER invent misconception categories.
All misconceptions come from this controlled taxonomy.
"""

from __future__ import annotations

from enum import Enum
from app.schemas.taxonomy import Misconception
from app.taxonomy.service import (
    TaxonomyService,
    get_taxonomy_service,
    get_unknown_misconception,
    UNKNOWN_MISCONCEPTION_ID,
)


# ---------------------------------------------------------------------------
# Concepts
# ---------------------------------------------------------------------------

class Concept(str, Enum):
    """ML concepts supported by FIXXY."""

    OVERFITTING = "overfitting"
    # Future expansions:
    # BIAS_VARIANCE = "bias_variance"
    # TRAIN_VAL_TEST = "train_val_test"


# ---------------------------------------------------------------------------
# Controlled Misconception IDs (Overfitting MVP: M1 to M6 + UNKNOWN)
# ---------------------------------------------------------------------------

class MisconceptionID(str, Enum):
    """Controlled misconception identifiers supporting both codes and canonical IDs."""

    # Short codes
    M1 = "M1"
    M2 = "M2"
    M3 = "M3"
    M4 = "M4"
    M5 = "M5"
    M6 = "M6"

    # Canonical full IDs
    OV_MEMORIZATION_IS_LEARNING = "ov_memorization_is_learning"
    OV_MORE_FEATURES_ALWAYS_BETTER = "ov_more_features_always_better"
    OV_MORE_DATA_ALONE_SOLVES_ALL = "ov_more_data_alone_solves_all"
    OV_REGULARIZATION_ELIMINATES_ALL = "ov_regularization_eliminates_all_overfitting"
    OV_COMPLEX_MODELS_ALWAYS_SUPERIOR = "ov_complex_models_always_superior"
    OV_VALIDATION_LOSS_IS_OPTIONAL = "ov_validation_loss_is_optional"

    # Fallback
    UNKNOWN = "UNKNOWN"


# ---------------------------------------------------------------------------
# Teaching strategies
# ---------------------------------------------------------------------------

class StrategyID(str, Enum):
    """Teaching strategy identifiers."""

    ANALOGY = "analogy"
    CONTRAST = "contrast"
    VISUALIZATION = "visualization"
    COUNTEREXAMPLE = "counterexample"
    SIMPLIFICATION = "simplification"
    SOCRATIC = "socratic"


# ---------------------------------------------------------------------------
# Functional taxonomy lookups
# ---------------------------------------------------------------------------

def get_misconceptions_for_concept(concept: Concept | str) -> list[Misconception]:
    """Return all taxonomy entries for concept (excluding UNKNOWN)."""
    concept_str = concept.value if isinstance(concept, Concept) else str(concept)
    service = get_taxonomy_service()
    return service.get_misconceptions_for_concept(concept_str)


def get_misconception_ids_for_concept(concept: Concept | str) -> list[str]:
    """Return misconception ID strings for a given concept."""
    misconceptions = get_misconceptions_for_concept(concept)
    return [m.id for m in misconceptions]


def get_misconception_by_id(misconception_id: str) -> Misconception | None:
    """Return the Misconception definition by ID or short_id, or None if not found."""
    service = get_taxonomy_service()
    return service.get_misconception_by_id(misconception_id)


def validate_misconception_id(raw: str) -> MisconceptionID:
    """Validate a raw string and return a MisconceptionID enum. Falls back to UNKNOWN."""
    service = get_taxonomy_service()
    # Check if raw directly matches an enum or canonical id
    if raw in [m.value for m in MisconceptionID]:
        return MisconceptionID(raw)
    
    valid_id_str = service.validate_misconception_id(raw, prefer_short=False)
    try:
        return MisconceptionID(valid_id_str)
    except ValueError:
        try:
            return MisconceptionID(service.validate_misconception_id(raw, prefer_short=True))
        except ValueError:
            return MisconceptionID.UNKNOWN


__all__ = [
    "Concept",
    "MisconceptionID",
    "StrategyID",
    "Misconception",
    "TaxonomyService",
    "get_taxonomy_service",
    "get_unknown_misconception",
    "get_misconceptions_for_concept",
    "get_misconception_ids_for_concept",
    "get_misconception_by_id",
    "validate_misconception_id",
    "UNKNOWN_MISCONCEPTION_ID",
]
