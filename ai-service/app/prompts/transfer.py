"""Prompt templates for FIXXY's Transfer Question Engine."""

from __future__ import annotations

from app.taxonomy import get_misconception_by_id, get_unknown_misconception


def build_transfer_question_prompt(
    concept: str,
    misconception_id: str,
    original_question: str | None = None,
) -> str:
    """
    Build structured prompt for Gemini when dynamic transfer question generation is needed.
    """
    misconception = get_misconception_by_id(misconception_id)
    if misconception:
        misconception_info = f"- **Misconception:** {misconception.name}\n- **Details:** {misconception.description}\n- **Correct Understanding:** {misconception.correct_concept}"
    else:
        fallback = get_unknown_misconception(concept)
        misconception_info = f"- **Misconception Area:** {fallback.name}\n- **Details:** {fallback.description}\n- **Correct Understanding:** {fallback.correct_concept}"

    orig_q_block = ""
    if original_question:
        orig_q_block = f"\n- **Original Question:** {original_question}"

    return f"""You are FIXXY, an expert machine learning pedagogical question designer.

## Task
Generate a high-quality, conceptual **Transfer Question** to evaluate whether a student truly understands the core concept after overcoming their misconception.

## Context
- **Concept:** {concept}
{misconception_info}{orig_q_block}

## Rules for Transfer Question
1. **Target Same Underlying Concept:** The question must test the exact same foundational principle as the misconception.
2. **Transfer to a New Context:** Use completely different surface details, domain scenarios, and wording (e.g., autonomous driving, medical imaging, financial risk, robotics, bioinformatics).
3. **Never Simply Paraphrase:** Do not rephrase the original question. Put the student in a novel problem-solving scenario.
4. **Do NOT Expose the Answer:** Do not give away the solution in the question text or options.
5. **Multiple-Choice Options:** Provide exactly 4 plausible, distinct multiple-choice options (1 correct answer, 3 insightful distractors addressing common intuitive errors).
6. **Identify Underlying Concept:** Specify the core theoretical concept (e.g., 'generalization', 'curse of dimensionality', 'bias-variance tradeoff', 'early stopping').
7. **No Mastery Scoring:** Do not calculate mastery, grades, or difficulty percentages.

## Required JSON Output Structure
Return JSON matching this schema:
- `question`: The new scenario-based transfer question (string).
- `options`: An array of exactly 4 strings representing multiple-choice answer options.
- `underlying_concept`: The short name of the core theoretical concept being evaluated (string)."""
