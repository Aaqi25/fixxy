"""Tests for the Controlled Misconception Taxonomy and TaxonomyService."""

import pytest
from app.taxonomy import (
    Concept,
    MisconceptionID,
    TaxonomyService,
    get_taxonomy_service,
    get_misconceptions_for_concept,
    get_misconception_ids_for_concept,
    get_misconception_by_id,
    validate_misconception_id,
    get_unknown_misconception,
    UNKNOWN_MISCONCEPTION_ID,
)
from app.schemas.taxonomy import Misconception


REQUIRED_FIELDS = [
    "id",
    "concept",
    "name",
    "description",
    "detection_examples",
    "correct_concept",
    "analogy",
    "simple_example",
    "technical_explanation",
    "hint",
    "retry_question",
    "transfer_question",
]

EXPECTED_OVERFITTING_IDS = {
    "ov_memorization_is_learning",
    "ov_more_features_always_better",
    "ov_more_data_alone_solves_all",
    "ov_regularization_eliminates_all_overfitting",
    "ov_complex_models_always_superior",
    "ov_validation_loss_is_optional",
}


class TestTaxonomyLoadingAndIntegrity:
    """Verify JSON taxonomy loading and schema integrity."""

    def test_taxonomy_loads_successfully(self):
        """TaxonomyService should load without errors."""
        service = TaxonomyService()
        assert service.total_count >= 6

    def test_all_6_overfitting_misconceptions_exist(self):
        """All exactly 6 Overfitting misconceptions must exist."""
        service = get_taxonomy_service()
        entries = service.get_misconceptions_for_concept("overfitting")
        ids = {m.id for m in entries}
        assert ids == EXPECTED_OVERFITTING_IDS
        assert len(entries) == 6

    def test_every_misconception_has_all_required_fields(self):
        """Every misconception entry must have all required fields populated."""
        service = get_taxonomy_service()
        entries = service.get_misconceptions_for_concept("overfitting")

        for m in entries:
            data = m.model_dump()
            for field in REQUIRED_FIELDS:
                assert field in data, f"Misconception {m.id} missing field: {field}"
                assert data[field] is not None, f"Misconception {m.id} has None in field: {field}"
                if isinstance(data[field], str):
                    assert len(data[field].strip()) > 0, f"Misconception {m.id} field {field} is empty"
                elif isinstance(data[field], list):
                    assert len(data[field]) > 0, f"Misconception {m.id} field {field} list is empty"

    def test_misconception_ids_are_unique(self):
        """All misconception IDs in the taxonomy must be unique."""
        service = get_taxonomy_service()
        all_ids = service.get_all_ids()
        assert len(all_ids) == len(set(all_ids)), "Duplicate misconception IDs detected"

    def test_retry_and_transfer_questions_exist(self):
        """Every misconception must have specific, non-empty retry and transfer questions."""
        service = get_taxonomy_service()
        for m in service.get_misconceptions_for_concept("overfitting"):
            assert len(m.retry_question.strip()) > 10, f"Short or missing retry_question on {m.id}"
            assert len(m.transfer_question.strip()) > 10, f"Short or missing transfer_question on {m.id}"
            assert m.retry_question != m.transfer_question, f"Retry and transfer questions must differ on {m.id}"


class TestTaxonomyServiceMethods:
    """Test lookup, validation, and safe fallback methods."""

    def test_get_misconception_by_id_found(self):
        m = get_misconception_by_id("ov_memorization_is_learning")
        assert m is not None
        assert isinstance(m, Misconception)
        assert m.name == "High Training Accuracy Equals General Learning"
        assert m.concept == "overfitting"

    def test_get_misconception_by_id_not_found(self):
        m = get_misconception_by_id("non_existent_misconception")
        assert m is None

    def test_get_misconceptions_for_concept(self):
        items = get_misconceptions_for_concept("overfitting")
        assert len(items) == 6
        items_enum = get_misconceptions_for_concept(Concept.OVERFITTING)
        assert len(items_enum) == 6

    def test_get_misconception_ids_for_concept(self):
        ids = get_misconception_ids_for_concept("overfitting")
        assert set(ids) == EXPECTED_OVERFITTING_IDS

    def test_validate_misconception_id_valid(self):
        result = validate_misconception_id("ov_more_features_always_better")
        assert result == MisconceptionID.OV_MORE_FEATURES_ALWAYS_BETTER
        assert result.value == "ov_more_features_always_better"

    def test_validate_misconception_id_invalid_returns_unknown(self):
        result = validate_misconception_id("random_hallucinated_id")
        assert result == MisconceptionID.UNKNOWN
        assert result.value == UNKNOWN_MISCONCEPTION_ID

    def test_validate_misconception_id_empty_returns_unknown(self):
        result = validate_misconception_id("")
        assert result == MisconceptionID.UNKNOWN

    def test_get_unknown_misconception_safe_fallback(self):
        unknown = get_unknown_misconception("overfitting")
        assert unknown.id == UNKNOWN_MISCONCEPTION_ID
        assert unknown.concept == "overfitting"
        assert unknown.name == "Unknown Misconception"
        assert unknown.retry_question
        assert unknown.transfer_question
