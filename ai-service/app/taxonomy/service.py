"""
Taxonomy Service — loads, indexes, validates, and queries the controlled
misconception taxonomy from data/misconceptions.json.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.schemas.taxonomy import Misconception, MisconceptionTaxonomyData

_DEFAULT_DATA_PATH = (
    Path(__file__).resolve().parent.parent.parent / "data" / "misconceptions.json"
)

UNKNOWN_MISCONCEPTION_ID = "UNKNOWN"


def get_unknown_misconception(concept: str = "overfitting") -> Misconception:
    """Return a safe fallback Misconception object for unidentified mistakes."""
    return Misconception(
        id=UNKNOWN_MISCONCEPTION_ID,
        short_id="UNKNOWN",
        concept=concept,
        name="Unknown Misconception",
        description="The student's mistake does not clearly match a known misconception in the controlled taxonomy.",
        detection_examples=[],
        correct_concept="Core understanding of the concept principles.",
        analogy="Learning to drive safely across different roads rather than memorizing a single route.",
        simple_example="Generalizing patterns across varying data distributions.",
        technical_explanation="Model behavior and error analysis without specific single-failure hypothesis.",
        hint="Carefully review the fundamental difference between training performance and evaluation on unseen data.",
        retry_question="How would you evaluate if a machine learning model is generalizing well?",
        transfer_question="If your model performs differently across two distinct environments, what diagnostics should you run first?",
    )


class TaxonomyService:
    """Service to load, index, and query the controlled misconception taxonomy."""

    def __init__(self, data_path: Path | str | None = None) -> None:
        self.data_path = Path(data_path) if data_path else _DEFAULT_DATA_PATH
        self._misconceptions: dict[str, Misconception] = {}
        self._short_id_map: dict[str, Misconception] = {}
        self._concept_index: dict[str, list[Misconception]] = {}
        self.load_taxonomy()

    def load_taxonomy(self) -> dict[str, Misconception]:
        """Load and validate the taxonomy from JSON file."""
        if not self.data_path.exists():
            raise FileNotFoundError(f"Taxonomy data file not found at: {self.data_path}")

        raw_content = self.data_path.read_text(encoding="utf-8")
        raw_json = json.loads(raw_content)

        if isinstance(raw_json, dict) and "misconceptions" in raw_json:
            parsed = MisconceptionTaxonomyData.model_validate(raw_json)
            misconceptions_list = parsed.misconceptions
        elif isinstance(raw_json, list):
            misconceptions_list = [Misconception.model_validate(item) for item in raw_json]
        else:
            raise ValueError(f"Invalid taxonomy structure in {self.data_path}")

        self._misconceptions.clear()
        self._short_id_map.clear()
        self._concept_index.clear()

        for m in misconceptions_list:
            if m.id in self._misconceptions:
                raise ValueError(f"Duplicate misconception ID found: {m.id}")
            self._misconceptions[m.id] = m
            if m.short_id:
                self._short_id_map[m.short_id.upper()] = m
                self._short_id_map[m.short_id.lower()] = m

            concept_key = m.concept.lower()
            if concept_key not in self._concept_index:
                self._concept_index[concept_key] = []
            self._concept_index[concept_key].append(m)

        return self._misconceptions

    def get_misconception_by_id(self, identifier: str) -> Misconception | None:
        """Retrieve a misconception by its unique ID or short_id (e.g. 'M1' or 'ov_memorization_is_learning')."""
        if not identifier:
            return None
        if identifier in self._misconceptions:
            return self._misconceptions[identifier]
        if identifier.upper() in self._short_id_map:
            return self._short_id_map[identifier.upper()]
        return None

    def get_misconceptions_for_concept(self, concept: str) -> list[Misconception]:
        """Retrieve all misconceptions belonging to a specific ML concept."""
        return self._concept_index.get(concept.lower(), [])

    def validate_misconception_id(self, raw_id: str, prefer_short: bool = True) -> str:
        """
        Validate a raw string ID or short ID against the controlled taxonomy.
        Returns the matched short_id (e.g. 'M1'..'M6') if prefer_short is True,
        or canonical ID if prefer_short is False, or 'UNKNOWN'.
        """
        if not raw_id:
            return UNKNOWN_MISCONCEPTION_ID

        clean = raw_id.strip()
        if clean.upper() in self._short_id_map:
            match = self._short_id_map[clean.upper()]
            return (match.short_id if prefer_short and match.short_id else match.id)
        if clean in self._misconceptions:
            match = self._misconceptions[clean]
            return (match.short_id if prefer_short and match.short_id else match.id)
        if clean.upper() in ("UNKNOWN", "UNK"):
            return UNKNOWN_MISCONCEPTION_ID

        return UNKNOWN_MISCONCEPTION_ID

    def get_all_ids(self) -> list[str]:
        """Return all valid misconception IDs in the taxonomy."""
        return list(self._misconceptions.keys())

    @property
    def total_count(self) -> int:
        """Total number of loaded misconceptions."""
        return len(self._misconceptions)


@lru_cache()
def get_taxonomy_service() -> TaxonomyService:
    """Return a cached singleton instance of TaxonomyService."""
    return TaxonomyService()
