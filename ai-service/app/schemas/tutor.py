"""Pydantic models for the FIXXY Tutor Engine."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# API request / response
# ---------------------------------------------------------------------------

class TutorRequest(BaseModel):
    """Request to generate a tutoring response."""

    concept: str = Field(..., description="The ML concept being taught.")
    misconception: str = Field(..., description="The diagnosed misconception name, description, or ID.")
    selected_teaching_strategy: str = Field(
        ...,
        description="Selected pedagogical teaching strategy (e.g. analogy, contrast, visualization).",
    )
    correct_concept: str = Field(
        ...,
        description="The correct concept explanation or canonical knowledge statement.",
    )
    rag_context: str | list[str] | None = Field(
        default=None,
        description="Retrieved curriculum knowledge or context chunks to ground the explanation.",
    )
    student_mastery: float | str | dict | None = Field(
        default=None,
        description="Current student mastery level or indicator.",
    )
    relevant_student_history: list[str] | list[dict] | str | None = Field(
        default=None,
        description="Relevant past student interaction history or prior attempts.",
    )

    # Optional context fields for additional grounding if available
    question_text: str | None = Field(default=None, description="Original question prompt.")
    student_answer: str | None = Field(default=None, description="Student's incorrect answer.")

    @model_validator(mode="before")
    @classmethod
    def remap_legacy_and_alias_fields(cls, data: Any) -> Any:
        """Allow flexible aliases for input fields."""
        if isinstance(data, dict):
            # Allow misconception_id -> misconception
            if "misconception" not in data and "misconception_id" in data:
                data["misconception"] = data["misconception_id"]

            # Allow strategy_id / strategy / teaching_strategy -> selected_teaching_strategy
            if "selected_teaching_strategy" not in data:
                if "strategy_id" in data:
                    data["selected_teaching_strategy"] = data["strategy_id"]
                elif "strategy" in data:
                    data["selected_teaching_strategy"] = data["strategy"]
                elif "teaching_strategy" in data:
                    data["selected_teaching_strategy"] = data["teaching_strategy"]

            # Allow correct_answer -> correct_concept
            if "correct_concept" not in data and "correct_answer" in data:
                data["correct_concept"] = data["correct_answer"]
        return data


class TutorResponse(BaseModel):
    """The structured tutoring response sent back to the student."""

    opening_message: str = Field(
        ...,
        description="Friendly study-friend greeting acknowledging the student's attempt.",
    )
    explanation: str = Field(
        ...,
        description="Concise explanation diagnosing the misconception using the chosen strategy and grounded in verified knowledge.",
    )
    hint: str = Field(
        ...,
        description="Helpful hint guiding the student towards the correct reasoning without immediately revealing the answer.",
    )
    retry_instruction: str = Field(
        ...,
        description="Encouraging instruction inviting the student to retry the question.",
    )


# ---------------------------------------------------------------------------
# Internal model for LLM structured output
# ---------------------------------------------------------------------------

class TutorLLMResult(BaseModel):
    """Schema given to Gemini for structured JSON tutoring output."""

    opening_message: str
    explanation: str
    hint: str
    retry_instruction: str


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------

class ClassifyResponseInPipeline(BaseModel):
    misconception_id: str
    misconception_name: str
    confidence: float
    reasoning: str


class StrategyResponseInPipeline(BaseModel):
    strategy_id: str
    strategy_name: str
    description: str


class PipelineRequest(BaseModel):
    """Single request that runs the full pipeline: classify → strategy → tutor."""

    concept: str = Field(..., description="ML concept, e.g. 'overfitting'.")
    question_text: str = Field(..., description="Question asked to the student.")
    student_answer: str = Field(..., description="Student's answer.")
    correct_answer: str = Field(..., description="Correct answer.")
    is_correct: bool = Field(..., description="Whether the answer was correct.")
    attempt_number: int = Field(default=1, ge=1, description="Attempt number.")


class PipelineResponse(BaseModel):
    """Full pipeline response combining all stages."""

    misconception: ClassifyResponseInPipeline
    strategy: StrategyResponseInPipeline
    tutor: TutorResponse


# ---------------------------------------------------------------------------
# Understanding evaluation
# ---------------------------------------------------------------------------

class EvaluateRequest(BaseModel):
    """Request to evaluate whether the student now understands the concept."""

    concept: str = Field(..., description="ML concept.")
    misconception_id: str = Field(..., description="Original misconception ID.")
    original_question: str = Field(..., description="Original question.")
    follow_up_question: str = Field(..., description="The follow-up question that was asked.")
    student_response: str = Field(..., description="Student's answer to the follow-up.")


class EvaluateResponse(BaseModel):
    """Evaluation of the student's understanding after tutoring."""

    understood: bool = Field(
        ...,
        description="Whether the student demonstrated understanding.",
    )
    feedback: str = Field(
        ...,
        description="Brief feedback on the student's response.",
    )
    remaining_gap: str | None = Field(
        default=None,
        description="If not understood, what gap remains.",
    )


class EvaluationLLMResult(BaseModel):
    """Schema for Gemini structured output when evaluating understanding."""

    understood: bool
    feedback: str
    remaining_gap: str


# ---------------------------------------------------------------------------
# Conversational Tutor Chat
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    """A single turn in the tutor-student chat."""

    role: str = Field(..., description="Role of the sender ('user' | 'tutor' | 'assistant')")
    content: str = Field(..., description="Text content of the message")


class TutorChatRequest(BaseModel):
    """Request payload for interactive student-tutor conversation."""

    concept: str = Field(..., description="The ML concept being taught.")
    question: str | None = Field(default=None, description="Original practice or retry question prompt.")
    correct_answer: str | None = Field(default=None, description="Correct answer text or core canonical concept.")
    student_answer: str | None = Field(default=None, description="Student's incorrect answer.")
    misconception_id: str | None = Field(default=None, description="Diagnosed misconception ID or description.")
    strategy: str | None = Field(default=None, description="Selected teaching strategy.")
    mastery: float | str | None = Field(default=None, description="Current student mastery level.")
    conversation: list[ChatMessage] = Field(
        default_factory=list,
        description="Prior conversation history in this tutoring session.",
    )
    message: str = Field(..., description="The latest message from the student.")

    @model_validator(mode="before")
    @classmethod
    def remap_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "correct_answer" not in data and "correctAnswer" in data:
                data["correct_answer"] = data["correctAnswer"]
            if "student_answer" not in data and "studentAnswer" in data:
                data["student_answer"] = data["studentAnswer"]
            if "misconception_id" not in data:
                if "misconceptionId" in data:
                    data["misconception_id"] = data["misconceptionId"]
                elif "misconception" in data:
                    data["misconception_id"] = data["misconception"]
        return data


class TutorChatResponse(BaseModel):
    """Response returned by FIXXY Tutor during interactive chat."""

    response: str = Field(..., description="The contextual tutoring response from FIXXY.")
    concept: str = Field(..., description="The ML concept.")
    misconception_id: str | None = Field(default=None, description="Diagnosed misconception ID.")

