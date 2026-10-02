"""
FIXXY Intervention Pipeline Orchestrator.

Coordinates:
1. Misconception Classifier
2. Student Strategy History & Strategy Selector
3. RAG Context Retrieval
4. FIXXY Tutor Engine
"""

from __future__ import annotations

from fastapi import HTTPException
from google import genai
from google.genai.errors import APIError

from app.classifier.engine import classify_misconception
from app.strategist.engine import select_strategy
from app.rag.service import get_rag_service, RAGService
from app.tutor.engine import generate_tutoring
from app.schemas.classifier import DiagnosisRequest
from app.schemas.strategist import StrategySelectRequest
from app.schemas.tutor import TutorRequest
from app.schemas.intervention import InterveneRequest, InterveneResponse
from app.taxonomy.service import TaxonomyService, get_taxonomy_service


async def orchestrate_intervention(
    request: InterveneRequest,
    client: genai.Client,
    taxonomy: TaxonomyService | None = None,
    rag_service: RAGService | None = None,
) -> InterveneResponse:
    """
    Run the full 7-step pedagogical intervention pipeline.

    1. Validate request (handled by Pydantic and concept sanity check).
    2. Run misconception classifier.
    3. Retrieve student strategy history.
    4. Select teaching strategy.
    5. Retrieve relevant RAG context.
    6. Generate FIXXY tutor response.
    7. Return one structured response.

    Rules:
    - Keep orchestration separate from individual services.
    - Do not duplicate classifier/strategy/tutor logic.
    - Handle UNKNOWN safely without inventing taxonomy IDs.
    - Never calculate mastery here.
    - Never persist student state here.
    """
    if not request.concept or not request.concept.strip():
        raise HTTPException(status_code=400, detail="Concept must not be empty.")

    tax_service = taxonomy or get_taxonomy_service()
    rag = rag_service or get_rag_service()

    try:
        # Step 2: Run Misconception Classifier
        diagnosis = await classify_misconception(
            DiagnosisRequest(
                concept=request.concept,
                question=request.question,
                correct_answer=request.correct_answer,
                student_answer=request.student_answer,
            ),
            client=client,
            taxonomy_service=tax_service,
        )

        # Step 3: Retrieve student strategy history
        strategy_history = {}
        student_mastery = None
        if request.student_context:
            strategy_history = request.student_context.strategy_scores or {}
            student_mastery = request.student_context.mastery

        # Step 4: Select teaching strategy
        strategy_result = select_strategy(
            StrategySelectRequest(
                history=strategy_history,
                concept=request.concept,
                misconception_id=diagnosis.misconception_id,
            )
        )

        # Step 5: Retrieve relevant RAG context (best-effort, non-blocking)
        rag_context = None
        try:
            query_str = f"{request.concept} {diagnosis.misconception_id} {request.question}"
            chunks = await rag.retrieve_context(
                query=query_str,
                top_k=2,
                doc_id=request.concept.lower(),
            )
            if chunks:
                rag_context = "\n\n".join(chunks)
        except Exception:
            rag_context = None

        # Step 6: Generate FIXXY Tutor Response
        # For UNKNOWN misconceptions, pass the reason or generic context without inventing taxonomy IDs
        misconception_payload = (
            diagnosis.misconception_id
            if diagnosis.misconception_id != "UNKNOWN"
            else (diagnosis.reason or "Uncategorized conceptual confusion")
        )

        tutor_response = await generate_tutoring(
            TutorRequest(
                concept=request.concept,
                misconception=misconception_payload,
                selected_teaching_strategy=strategy_result.strategy,
                correct_concept=request.correct_answer,
                rag_context=rag_context,
                student_mastery=student_mastery,
                question_text=request.question,
                student_answer=request.student_answer,
            ),
            client=client,
        )

        # Step 7: Return structured unified response
        return InterveneResponse(
            misconception_id=diagnosis.misconception_id,
            confidence=diagnosis.confidence,
            strategy=strategy_result.strategy,
            opening_message=tutor_response.opening_message,
            explanation=tutor_response.explanation,
            hint=tutor_response.hint,
            retry_instruction=tutor_response.retry_instruction,
        )

    except HTTPException:
        raise
    except APIError as api_err:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error during intervention pipeline: {api_err}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Intervention pipeline failed: {exc}",
        )
