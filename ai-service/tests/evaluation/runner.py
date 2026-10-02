"""
Evaluation runner for FIXXY Misconception Classification & AI Intervention.

Evaluates misconception detection accuracy across curated benchmarks and prints
compact performance reports.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from google import genai

from app.classifier.engine import classify_misconception
from app.schemas.classifier import DiagnosisRequest, DiagnosisResponse
from app.taxonomy.service import TaxonomyService, get_taxonomy_service

_DATASET_PATH = Path(__file__).resolve().parent / "dataset.json"


@dataclass
class CaseResult:
    case_id: str
    concept: str
    expected_id: str
    predicted_id: str
    is_correct: bool
    confidence: float
    reason: str


@dataclass
class EvaluationReport:
    total_cases: int
    correct_cases: int
    accuracy_percentage: float
    per_misconception: dict[str, dict[str, Any]]
    results: list[CaseResult] = field(default_factory=list)

    def format_text(self) -> str:
        """Format a clean, compact console report."""
        lines = [
            "FIXXY Misconception Evaluation",
            "------------------------------",
            f"Total cases: {self.total_cases}",
            f"Correct: {self.correct_cases}",
            f"Accuracy: {self.accuracy_percentage:.1f}%",
            "",
        ]
        for m_id, stats in sorted(self.per_misconception.items()):
            m_correct = stats["correct"]
            m_total = stats["total"]
            m_acc = stats["accuracy"]
            lines.append(f"{m_id}: {m_correct}/{m_total} ({m_acc:.1f}%)")

        return "\n".join(lines)


def load_evaluation_dataset(dataset_path: Path | str | None = None) -> list[dict[str, Any]]:
    """Load benchmark cases from dataset.json."""
    path = Path(dataset_path) if dataset_path else _DATASET_PATH
    if not path.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


async def run_evaluation(
    client: genai.Client,
    cases: list[dict[str, Any]] | None = None,
    taxonomy: TaxonomyService | None = None,
    dataset_path: Path | str | None = None,
) -> EvaluationReport:
    """
    Run evaluation across all benchmark cases.

    1. Sends each case through the classifier
    2. Compares prediction with expected ID
    3. Calculates accuracy and per-misconception stats
    4. Returns EvaluationReport
    """
    eval_cases = cases or load_evaluation_dataset(dataset_path)
    tax = taxonomy or get_taxonomy_service()

    results: list[CaseResult] = []
    per_m: dict[str, dict[str, int]] = {}

    for item in eval_cases:
        case_id = item.get("id", "case")
        concept = item["concept"]
        question = item["question"]
        correct_answer = item["correct_answer"]
        student_answer = item["student_answer"]
        expected_id = item["expected_misconception_id"].strip().upper()

        if expected_id not in per_m:
            per_m[expected_id] = {"correct": 0, "total": 0}
        per_m[expected_id]["total"] += 1

        diagnosis: DiagnosisResponse = await classify_misconception(
            DiagnosisRequest(
                concept=concept,
                question=question,
                correct_answer=correct_answer,
                student_answer=student_answer,
            ),
            client=client,
            taxonomy_service=tax,
        )

        pred_id = diagnosis.misconception_id.strip().upper()
        # Canonical alias matching if needed
        matched = tax.get_misconception_by_id(pred_id)
        if matched and matched.short_id:
            pred_id = matched.short_id.upper()

        is_correct = (pred_id == expected_id)
        if is_correct:
            per_m[expected_id]["correct"] += 1

        results.append(
            CaseResult(
                case_id=case_id,
                concept=concept,
                expected_id=expected_id,
                predicted_id=pred_id,
                is_correct=is_correct,
                confidence=diagnosis.confidence,
                reason=diagnosis.reason,
            )
        )

    total = len(results)
    correct = sum(1 for r in results if r.is_correct)
    acc = (correct / total * 100.0) if total > 0 else 0.0

    per_misconception_stats = {}
    for m_id, stats in per_m.items():
        tot = stats["total"]
        cor = stats["correct"]
        pct = (cor / tot * 100.0) if tot > 0 else 0.0
        per_misconception_stats[m_id] = {
            "correct": cor,
            "total": tot,
            "accuracy": pct,
        }

    return EvaluationReport(
        total_cases=total,
        correct_cases=correct,
        accuracy_percentage=acc,
        per_misconception=per_misconception_stats,
        results=results,
    )
