"""Prompt templates for the FIXXY Tutor Engine and Understanding Evaluator."""

from __future__ import annotations

from typing import Any
from app.taxonomy import (
    get_misconception_by_id,
    get_unknown_misconception,
    StrategyID,
)


# ---------------------------------------------------------------------------
# Strategy descriptions (used in tutor prompt)
# ---------------------------------------------------------------------------

STRATEGY_INSTRUCTIONS: dict[str, str] = {
    "analogy": (
        "Use a relatable real-world ANALOGY: bridge the student's current misconception to a familiar everyday scenario "
        "so the intuitive mechanism clicks naturally."
    ),
    "contrast": (
        "Use CONTRAST: directly juxtapose the misconception against the correct concept side by side. "
        "Explicitly highlight the critical difference between the two."
    ),
    "visualization": (
        "Use VISUALIZATION: describe a mental image, plot, or diagram (e.g. training vs test loss curves, decision boundaries) "
        "that visually reveals where the misconception fails."
    ),
    "counterexample": (
        "Use a COUNTEREXAMPLE: provide a concrete edge case or practical scenario where the flawed assumption leads to an obvious failure, "
        "showing why it cannot hold."
    ),
    "simplification": (
        "Use SIMPLIFICATION: deconstruct the concept down to fundamental first principles using straightforward, step-by-step logic "
        "without jargon overload."
    ),
    "socratic": (
        "Use the SOCRATIC approach: pose a guiding thought experiment or reflective scenario that leads the student to spot "
        "the flaw in their reasoning on their own."
    ),
}


def _resolve_strategy_instruction(strategy: str) -> str:
    """Resolve human-readable strategy instructions from strategy ID or string."""
    norm = strategy.strip().lower().replace("-", "_").replace(" ", "_")
    # Check direct match or enum value
    for key, text in STRATEGY_INSTRUCTIONS.items():
        if key in norm or norm in key:
            return text
    try:
        sid = StrategyID(norm)
        return STRATEGY_INSTRUCTIONS.get(sid.value, "Explain the concept clearly and helpfully.")
    except (ValueError, KeyError):
        return STRATEGY_INSTRUCTIONS.get("analogy", "Explain the concept clearly and helpfully.")


def _resolve_misconception_text(concept: str, misconception: str) -> str:
    """Resolve misconception details from taxonomy if an ID is passed, else return string."""
    matched = get_misconception_by_id(misconception)
    if matched:
        return f"{matched.name}: {matched.description}"
    if misconception.upper() == "UNKNOWN":
        fallback = get_unknown_misconception(concept)
        return f"{fallback.name}: {fallback.description}"
    return misconception


def build_tutor_prompt(
    concept: str,
    misconception: str,
    selected_teaching_strategy: str,
    correct_concept: str,
    rag_context: str | list[str] | None = None,
    student_mastery: float | str | dict | None = None,
    relevant_student_history: list[str] | list[dict] | str | None = None,
    question_text: str | None = None,
    student_answer: str | None = None,
) -> str:
    """
    Build the structured prompt for the FIXXY Tutor Engine.
    
    Adheres strictly to tutor behavioral constraints:
    - Acts like a friendly study friend.
    - Diagnoses the misconception rather than merely restating the answer.
    - Uses the selected teaching strategy.
    - Grounds explanation in retrieved RAG knowledge.
    - Does not immediately reveal the answer.
    - Provides a useful hint and retry instructions.
    - Concise for learning UI.
    - No mastery calculation or correctness grading.
    """
    misconception_desc = _resolve_misconception_text(concept, misconception)
    strategy_instruction = _resolve_strategy_instruction(selected_teaching_strategy)

    # Format RAG context block
    rag_block = ""
    if rag_context:
        if isinstance(rag_context, list):
            formatted_rag = "\n\n".join(f"- {chunk}" for chunk in rag_context if chunk)
        else:
            formatted_rag = str(rag_context).strip()
        if formatted_rag:
            rag_block = f"""
## Retrieved Curriculum Knowledge (Ground Truth)
Use the following verified knowledge to ground your explanation. Do NOT fabricate facts outside this domain:
{formatted_rag}
"""

    # Format Student Mastery block
    mastery_block = ""
    if student_mastery is not None:
        mastery_block = f"\n- **Student Mastery Context:** {student_mastery}"

    # Format History block
    history_block = ""
    if relevant_student_history:
        if isinstance(relevant_student_history, list):
            hist_str = "; ".join(str(h) for h in relevant_student_history)
        else:
            hist_str = str(relevant_student_history)
        history_block = f"\n- **Relevant Student History:** {hist_str}"

    # Question & Answer blocks if present
    qa_block = ""
    if question_text:
        qa_block += f"\n- **Original Question:** {question_text}"
    if student_answer:
        qa_block += f"\n- **Student's Response:** {student_answer}"

    return f"""You are FIXXY, a friendly, encouraging study friend helping a fellow student master machine learning.

## Pedagogical Task
- **Concept Being Studied:** {concept}
- **Diagnosed Misconception:** {misconception_desc}
- **Selected Teaching Strategy:** {strategy_instruction}
- **Correct Concept (Target Understanding):** {correct_concept}{qa_block}{mastery_block}{history_block}
{rag_block}
## Tutor Behavioral Guidelines
1. **Friendly Study Friend Persona:** Sound like a warm, supportive, collaborative peer study buddy. Never be condescending or overly academic.
2. **Diagnose the Misconception:** Address the core confusion in the student's thinking and why someone might think that way, rather than merely stating the right answer.
3. **Strictly Apply Selected Strategy:** Follow the selected teaching strategy ({selected_teaching_strategy}) in your explanation.
4. **Ground in Retrieved Knowledge:** Use the retrieved curriculum facts faithfully. Do NOT invent or fabricate facts.
5. **Do NOT Immediately Reveal the Answer:** Guide the student to build intuition so they discover the correct insight themselves.
6. **Provide a Useful Hint:** Offer a targeted, thought-provoking hint that illuminates the path to the correct reasoning.
7. **Encourage to Retry:** Give a clear, motivating instruction on what to consider when trying the problem again.
8. **Concise for Learning UI:** Keep the explanation punchy (2-4 sentences max) suitable for interactive micro-learning.
9. **Do NOT Calculate Mastery:** Do not output grades, percentage mastery, or score calculations.
10. **Do NOT Grade Correctness:** Focus entirely on coaching and conceptual clarity.

## Required JSON Output Structure
Output ONLY a JSON object matching this schema:
- `opening_message`: Friendly greeting and supportive framing as a peer study buddy (1 short sentence).
- `explanation`: Targeted explanation diagnosing why the misconception happens and explaining the intuition using the chosen strategy (2-4 concise sentences).
- `hint`: Actionable, guiding hint pointing toward the solution without giving away the direct answer (1-2 sentences).
- `retry_instruction`: Clear, encouraging prompt telling the student what to try or reflect on next (1 sentence)."""


def build_evaluation_prompt(
    concept: str,
    misconception_id: str,
    original_question: str,
    follow_up_question: str,
    student_response: str,
) -> str:
    """Build the understanding evaluation prompt."""

    misconception = get_misconception_by_id(misconception_id)
    if misconception:
        misconception_desc = f"{misconception.name}: {misconception.description}"
    else:
        fallback = get_unknown_misconception(concept)
        misconception_desc = f"{fallback.name}: {fallback.description}"

    return f"""You are FIXXY, an AI tutor evaluating whether a student now understands a concept after being taught.

## Context
- **Concept:** {concept}
- **Original misconception:** {misconception_desc}
- **Original question:** {original_question}
- **Follow-up question asked:** {follow_up_question}
- **Student's response:** {student_response}

## Your Task
Determine whether the student's response demonstrates that they have overcome their misconception and understand the concept correctly.

## Rules
- Focus on whether the MISCONCEPTION has been addressed, not perfect wording.
- Be generous — partial understanding is progress.
- If not understood, identify what gap remains.
- Do NOT calculate scores or mastery.

Return your response as JSON with these fields:
- understood (boolean): true if the student shows understanding
- feedback (string): brief, encouraging feedback (1-2 sentences)
- remaining_gap (string): if not understood, what's still missing (empty string if understood)"""
