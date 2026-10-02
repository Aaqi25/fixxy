"""Prompt templates for FIXXY's Misconception Classifier."""

from __future__ import annotations

from app.schemas.taxonomy import Misconception


def format_taxonomy_for_prompt(misconceptions: list[Misconception]) -> str:
    """Format the list of misconceptions into a clear structured prompt block."""
    lines: list[str] = []
    for m in misconceptions:
        code = m.short_id or m.id
        detection_hints = ""
        if m.detection_examples:
            detection_hints = f" | Examples: {'; '.join(m.detection_examples[:2])}"
        lines.append(f"- {code} ({m.name}): {m.description}{detection_hints}")
    return "\n".join(lines)


def build_diagnosis_prompt(
    concept: str,
    question: str,
    correct_answer: str,
    student_answer: str,
    misconceptions: list[Misconception],
) -> str:
    """
    Build the diagnosis prompt matching FIXXY's classifier requirements.
    Constrains the LLM to choose from M1..M6 or UNKNOWN.
    """
    allowed_ids = [m.short_id or m.id for m in misconceptions] + ["UNKNOWN"]
    allowed_str = "\n".join(allowed_ids)
    taxonomy_str = format_taxonomy_for_prompt(misconceptions)

    return f"""You are FIXXY's misconception classifier.

Your task is to identify the likely conceptual misconception
behind a student's incorrect answer.

You MUST choose exactly one ID from the supplied taxonomy.

Allowed outputs:
{allowed_str}

Rules:
- Never invent a misconception.
- Do not classify merely because the answer is incorrect.
- Infer the likely misunderstanding from the question and student answer.
- If the evidence is insufficient, return UNKNOWN.
- Return structured JSON only with fields: misconception_id, confidence, reason.

Concept:
{concept}

Question:
{question}

Correct answer:
{correct_answer}

Student answer:
{student_answer}

Controlled misconception taxonomy:
{taxonomy_str}"""


# Compatibility alias
build_classification_prompt = build_diagnosis_prompt
