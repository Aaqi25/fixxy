"""
FIXXY Brain API routes.

All endpoints are designed to be called by the Node.js backend.
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from google import genai

from app.dependencies import get_gemini_client, get_optional_gemini_client, get_taxonomy
from app.classifier.engine import classify_misconception
from app.strategist.engine import select_strategy
from app.tutor.engine import generate_tutoring, evaluate_understanding
from app.pipeline.orchestrator import orchestrate_intervention
from app.transfer.engine import generate_transfer_question
from app.rag.engine import retrieve_context
from app.schemas.classifier import (
    DiagnosisRequest,
    DiagnosisResponse,
)
from app.schemas.strategist import (
    StrategySelectRequest,
    StrategySelectResponse,
    StrategyRequest,
    StrategyResponse,
)
from app.schemas.tutor import (
    TutorRequest,
    TutorResponse,
    PipelineRequest,
    PipelineResponse,
    ClassifyResponseInPipeline,
    StrategyResponseInPipeline,
    EvaluateRequest,
    EvaluateResponse,
    TutorChatRequest,
    TutorChatResponse,
)
from app.tutor.chat import chat_with_tutor
from app.schemas.intervention import (
    InterveneRequest,
    InterveneResponse,
)
from app.schemas.transfer import (
    TransferRequest,
    TransferResponse,
)
from app.schemas.rag import RAGRequest, RAGResponse
from app.taxonomy.service import TaxonomyService
from app.taxonomy import Concept, get_misconception_ids_for_concept

router = APIRouter()


# ---------------------------------------------------------------------------
# Task 7: Full Intervention Pipeline (/ai/intervene) endpoint
# ---------------------------------------------------------------------------

@router.post("/ai/intervene", response_model=InterveneResponse)
@router.post("/intervene", response_model=InterveneResponse)
async def api_intervene(
    request: InterveneRequest,
    client: genai.Client = Depends(get_gemini_client),
    taxonomy: TaxonomyService = Depends(get_taxonomy),
) -> InterveneResponse:
    """
    Orchestrate FIXXY's complete pedagogical intervention pipeline:
    1. Validate request
    2. Classify misconception
    3. Retrieve strategy history
    4. Select teaching strategy
    5. Retrieve RAG knowledge
    6. Generate friendly FIXXY tutor response
    7. Return structured unified response
    """
    return await orchestrate_intervention(request, client, taxonomy)


# ---------------------------------------------------------------------------
# Task 8: Transfer Question Engine (/ai/transfer) endpoint
# ---------------------------------------------------------------------------

@router.post("/ai/transfer", response_model=TransferResponse)
@router.post("/transfer", response_model=TransferResponse)
async def api_transfer(
    request: TransferRequest,
    client: genai.Client | None = Depends(get_optional_gemini_client),
    taxonomy: TaxonomyService = Depends(get_taxonomy),
) -> TransferResponse:
    """
    Generate or retrieve a transfer question testing the same underlying concept
    in a new surface domain scenario.
    """
    try:
        return await generate_transfer_question(request, client, taxonomy)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transfer question generation failed: {e}")


# ---------------------------------------------------------------------------
# Task 3: /ai/diagnose endpoint
# ---------------------------------------------------------------------------

@router.post("/ai/diagnose", response_model=DiagnosisResponse)
@router.post("/diagnose", response_model=DiagnosisResponse)
async def api_diagnose(
    request: DiagnosisRequest,
    client: genai.Client = Depends(get_gemini_client),
    taxonomy: TaxonomyService = Depends(get_taxonomy),
) -> DiagnosisResponse:
    """Diagnose a student's misconception from their answer using Gemini."""
    try:
        return await classify_misconception(request, client, taxonomy)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {e}")


# ---------------------------------------------------------------------------
# Task 4: Strategy selector endpoint
# ---------------------------------------------------------------------------

@router.post("/ai/strategy", response_model=StrategySelectResponse)
@router.post("/strategy", response_model=StrategySelectResponse)
async def api_strategy(
    request: StrategySelectRequest | StrategyRequest | dict[str, float] = Body(...),
) -> StrategySelectResponse:
    """Select the best teaching strategy deterministically based on effectiveness history."""
    return select_strategy(request)


# ---------------------------------------------------------------------------
# Task 6: Tutor Engine (/ai/teach) endpoint
# ---------------------------------------------------------------------------

@router.post("/ai/teach", response_model=TutorResponse)
@router.post("/teach", response_model=TutorResponse)
@router.post("/tutor", response_model=TutorResponse)
async def api_teach(
    request: TutorRequest,
    client: genai.Client = Depends(get_gemini_client),
) -> TutorResponse:
    """Generate a structured personalized tutoring response for a student misconception."""
    try:
        return await generate_tutoring(request, client)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Teaching failed: {e}")


# ---------------------------------------------------------------------------
# Conversational Tutor Chat (/ai/chat) endpoint
# ---------------------------------------------------------------------------

@router.post("/ai/chat", response_model=TutorChatResponse)
@router.post("/chat", response_model=TutorChatResponse)
@router.post("/tutor/chat", response_model=TutorChatResponse)
async def api_chat(
    request: TutorChatRequest,
    client: genai.Client | None = Depends(get_optional_gemini_client),
    taxonomy: TaxonomyService = Depends(get_taxonomy),
) -> TutorChatResponse:
    """
    Interactive multi-turn pedagogical tutoring chat with FIXXY.
    Maintains context, adapts explanations dynamically, and prevents direct answer leaking.
    """
    try:
        return await chat_with_tutor(request, client, taxonomy)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tutor chat failed: {e}")



# ---------------------------------------------------------------------------
# Legacy / auxiliary endpoints
# ---------------------------------------------------------------------------

@router.post("/classify", response_model=DiagnosisResponse)
async def api_classify(
    request: DiagnosisRequest,
    client: genai.Client = Depends(get_gemini_client),
    taxonomy: TaxonomyService = Depends(get_taxonomy),
) -> DiagnosisResponse:
    """Classify a student's misconception from their answer."""
    try:
        return await classify_misconception(request, client, taxonomy)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {e}")


@router.post("/rag/retrieve", response_model=RAGResponse)
async def api_rag_retrieve(request: RAGRequest) -> RAGResponse:
    """Retrieve relevant knowledge chunks via RAG."""
    try:
        return await retrieve_context(request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG retrieval failed: {e}")


@router.post("/evaluate", response_model=EvaluateResponse)
async def api_evaluate(
    request: EvaluateRequest,
    client: genai.Client = Depends(get_gemini_client),
) -> EvaluateResponse:
    """Evaluate whether the student understood after tutoring."""
    try:
        return await evaluate_understanding(request, client)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")


# ---------------------------------------------------------------------------
# Full pipeline endpoint (legacy)
# ---------------------------------------------------------------------------

@router.post("/pipeline", response_model=PipelineResponse)
async def api_pipeline(
    request: PipelineRequest,
    client: genai.Client = Depends(get_gemini_client),
    taxonomy: TaxonomyService = Depends(get_taxonomy),
) -> PipelineResponse:
    """
    Run the full tutoring pipeline in one call:
    diagnose -> strategy -> RAG -> tutor.
    """
    if request.is_correct:
        raise HTTPException(
            status_code=400,
            detail="Student answered correctly — no tutoring pipeline needed.",
        )

    # Step 1: Diagnose misconception
    diagnose_result = await classify_misconception(
        DiagnosisRequest(
            concept=request.concept,
            question=request.question_text,
            correct_answer=request.correct_answer,
            student_answer=request.student_answer,
        ),
        client,
        taxonomy,
    )

    # Step 2: Select teaching strategy
    strategy_result = select_strategy(
        StrategyRequest(
            concept=request.concept,
            misconception_id=diagnose_result.misconception_id,
            attempt_number=request.attempt_number,
        )
    )

    # Step 3: RAG retrieval (best-effort, non-blocking)
    rag_context = None
    try:
        rag_result = await retrieve_context(
            RAGRequest(
                concept=request.concept,
                misconception_id=diagnose_result.misconception_id,
            )
        )
        if rag_result.chunks:
            rag_context = "\n\n".join(c.content for c in rag_result.chunks)
    except Exception:
        pass

    # Step 4: Generate tutoring response
    tutor_result = await generate_tutoring(
        TutorRequest(
            concept=request.concept,
            misconception=diagnose_result.reason or diagnose_result.misconception_id,
            selected_teaching_strategy=strategy_result.strategy_id or strategy_result.strategy,
            correct_concept=request.correct_answer,
            rag_context=rag_context,
            question_text=request.question_text,
            student_answer=request.student_answer,
        ),
        client,
    )

    matched_entry = taxonomy.get_misconception_by_id(diagnose_result.misconception_id)
    misconception_name = matched_entry.name if matched_entry else "Unknown Misconception"

    return PipelineResponse(
        misconception=ClassifyResponseInPipeline(
            misconception_id=diagnose_result.misconception_id,
            misconception_name=misconception_name,
            confidence=diagnose_result.confidence,
            reasoning=diagnose_result.reason,
        ),
        strategy=StrategyResponseInPipeline(
            strategy_id=strategy_result.strategy_id or strategy_result.strategy,
            strategy_name=strategy_result.strategy_name or "Teaching Strategy",
            description=strategy_result.description or "",
        ),
        tutor=tutor_result,
    )


# ---------------------------------------------------------------------------
# Info endpoint
# ---------------------------------------------------------------------------

@router.get("/taxonomy/{concept}")
async def api_taxonomy(concept: str) -> dict:
    """Return the misconception taxonomy for a concept."""
    try:
        c = Concept(concept.lower())
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Concept '{concept}' not found. Available: {[c.value for c in Concept]}",
        )

    ids = get_misconception_ids_for_concept(c)
    return {"concept": c.value, "misconception_ids": ids}
