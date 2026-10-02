"""
FIXXY Transfer Question Engine.

Generates scenario-based transfer questions to test whether a student has truly
mastered a concept after an intervention.

Prefers deterministic curated questions for the hackathon, and uses Gemini
as a structured fallback for unmapped concepts.
"""

from __future__ import annotations

from google import genai
from google.genai import types

from app.config import settings
from app.schemas.transfer import (
    TransferRequest,
    TransferResponse,
    TransferLLMResult,
)
from app.prompts.transfer import build_transfer_question_prompt
from app.taxonomy.service import (
    TaxonomyService,
    get_taxonomy_service,
    UNKNOWN_MISCONCEPTION_ID,
)


# ---------------------------------------------------------------------------
# Curated Deterministic Transfer Questions
# ---------------------------------------------------------------------------

CURATED_TRANSFER_BANK: dict[str, dict] = {
    "M1": {
        "concept": "overfitting",
        "question": "A facial recognition model achieves 100% accuracy on 200 training photos of company employees. When tested on 50 new photos of the same employees taken outdoors in natural sunlight, the accuracy drops to 48%. What is the most likely cause?",
        "options": [
            "The model memorized specific lighting and pixel artifacts in the training photos rather than learning general facial features.",
            "The dataset was too large for the model to effectively process during training.",
            "The outdoor photos contained too few pixels to match the training distribution.",
            "The model underfitted because the training loss was driven to zero.",
        ],
        "underlying_concept": "generalization",
    },
    "M2": {
        "concept": "overfitting",
        "question": "A biomedical researcher adds 5,000 gene expression measurements to predict patient recovery in a clinical trial with only 60 patients. Test accuracy drops significantly compared to using just 5 core biomarkers. Why did this occur?",
        "options": [
            "The high feature dimensionality relative to sample size allowed the model to fit accidental noise and spurious correlations.",
            "Biological data cannot be processed using statistical machine learning models.",
            "Adding extra features inherently forces the model into high-bias underfitting.",
            "The model capacity was reduced because the parameter space grew too large.",
        ],
        "underlying_concept": "curse of dimensionality",
    },
    "M3": {
        "concept": "overfitting",
        "question": "An autonomous vehicle company trains a massive 100-billion parameter vision model on 2 million highway images from California. When deployed in snowy Boston, the system frequently misidentifies lane boundaries. Why did having 2 million training images not prevent this failure?",
        "options": [
            "The enormous model capacity allowed it to memorize California-specific environmental features without learning invariant road geometry.",
            "Modern vision architectures are mathematically immune to overfitting regardless of model size.",
            "Overfitting is impossible whenever training datasets exceed 1 million instances.",
            "The model required zero regularization to adapt to snowy conditions.",
        ],
        "underlying_concept": "model capacity vs dataset diversity",
    },
    "M4": {
        "concept": "overfitting",
        "question": "A machine learning engineer enables L2 weight decay on a deep neural network, but sets the regularization coefficient lambda to 1e-9. The model continues to exhibit near-zero training loss alongside severe test error. Why did regularization fail to prevent overfitting?",
        "options": [
            "The regularization penalty was far too weak to meaningfully constrain the model's effective hypothesis space.",
            "L2 regularization can only be applied to linear classifiers, not neural networks.",
            "Adding any non-zero regularization parameter automatically eliminates all variance errors.",
            "The model suffered from extreme bias caused by excessive weight penalties.",
        ],
        "underlying_concept": "regularization hyperparameter tuning",
    },
    "M5": {
        "concept": "overfitting",
        "question": "A customer churn dataset contains 120 tabular records with a strong linear relationship between customer tenure and churn rate. A 20-layer deep neural network achieves significantly lower test accuracy than a simple regularized logistic regression. Why?",
        "options": [
            "The excessive capacity of the 20-layer network caused high variance and fit sample noise, whereas the simpler model generalized well.",
            "Logistic regression is fundamentally more expressive and flexible than multi-layer neural networks.",
            "Tabular data cannot be mathematically optimized with gradient descent.",
            "The deep network suffered from high bias and underfitted the 120 records.",
        ],
        "underlying_concept": "bias-variance tradeoff and model capacity",
    },
    "M6": {
        "concept": "overfitting",
        "question": "During 300 epochs of training, a model's training loss drops steadily from 0.80 to 0.01, but its validation loss reaches a minimum at epoch 45 (0.28) and continuously rises to 0.75 by epoch 300. Which model checkpoint should be selected for production deployment?",
        "options": [
            "The checkpoint at epoch 45, because subsequent training fit training set noise and degraded generalization performance.",
            "The checkpoint at epoch 300, because it achieved the absolute lowest training loss on the dataset.",
            "The checkpoint at epoch 1, because training weights had not yet been distorted by gradient updates.",
            "Any checkpoint after epoch 250, because rising validation loss is irrelevant when training loss is low.",
        ],
        "underlying_concept": "validation loss monitoring and early stopping",
    },
    "UNKNOWN": {
        "concept": "overfitting",
        "question": "A machine learning model achieves 99% accuracy on its training data, but its accuracy drops to 61% when evaluated on a newly collected validation set from the same domain. What diagnostic evaluation should the engineer conduct first?",
        "options": [
            "Compare training vs validation performance curves to assess the generalization gap and check for overfitting.",
            "Immediately deploy the model to production since training accuracy is above 95%.",
            "Discard the validation set because training data is always more reliable.",
            "Increase model parameters by 10x without validating on unseen data.",
        ],
        "underlying_concept": "generalization error and evaluation",
    },
}

# Alias mapping from canonical IDs (e.g. ov_memorization_is_learning) to short IDs (e.g. M1)
CANONICAL_TO_SHORT: dict[str, str] = {
    "ov_memorization_is_learning": "M1",
    "ov_more_features_always_better": "M2",
    "ov_more_data_alone_solves_all": "M3",
    "ov_regularization_eliminates_all_overfitting": "M4",
    "ov_complex_models_always_superior": "M5",
    "ov_validation_loss_is_optional": "M6",
}


async def generate_transfer_question(
    request: TransferRequest,
    client: genai.Client | None = None,
    taxonomy: TaxonomyService | None = None,
) -> TransferResponse:
    """
    Generate or retrieve a transfer question for a concept and diagnosed misconception.

    Rules:
    1. Prefer deterministic curated transfer questions where available.
    2. Fall back to Gemini structured output if a curated question is unavailable.
    3. Test the same underlying concept in a new domain context.
    4. Never reveal the answer in the text.
    5. Return structured Pydantic response.
    """
    tax = taxonomy or get_taxonomy_service()
    raw_id = request.misconception_id.strip()

    # Normalize ID to short_id if possible
    short_id = raw_id.upper()
    if short_id in CURATED_TRANSFER_BANK and request.concept.lower() == "overfitting":
        curated = CURATED_TRANSFER_BANK[short_id]
        return TransferResponse(
            concept=request.concept,
            question=curated["question"],
            options=curated["options"],
            underlying_concept=curated["underlying_concept"],
        )

    # Check canonical mapping
    canonical_id = raw_id.lower()
    if canonical_id in CANONICAL_TO_SHORT:
        mapped_short = CANONICAL_TO_SHORT[canonical_id]
        if mapped_short in CURATED_TRANSFER_BANK:
            curated = CURATED_TRANSFER_BANK[mapped_short]
            return TransferResponse(
                concept=request.concept,
                question=curated["question"],
                options=curated["options"],
                underlying_concept=curated["underlying_concept"],
            )

    # Check taxonomy for matching item
    matched = tax.get_misconception_by_id(raw_id)
    if matched and matched.short_id and matched.short_id.upper() in CURATED_TRANSFER_BANK:
        curated = CURATED_TRANSFER_BANK[matched.short_id.upper()]
        return TransferResponse(
            concept=request.concept,
            question=curated["question"],
            options=curated["options"],
            underlying_concept=curated["underlying_concept"],
        )

    # Check if UNKNOWN fallback in bank matches concept
    if raw_id.upper() in ("UNKNOWN", "UNK") and request.concept.lower() == "overfitting":
        curated = CURATED_TRANSFER_BANK["UNKNOWN"]
        return TransferResponse(
            concept=request.concept,
            question=curated["question"],
            options=curated["options"],
            underlying_concept=curated["underlying_concept"],
        )

    # Dynamic Fallback: Use Gemini structured output if client is available
    if client is not None:
        try:
            prompt = build_transfer_question_prompt(
                concept=request.concept,
                misconception_id=raw_id,
                original_question=request.original_question,
            )

            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=TransferLLMResult,
                    temperature=0.4,
                ),
            )

            response_text = response.text if hasattr(response, "text") else str(response)
            llm_result = TransferLLMResult.model_validate_json(response_text)

            return TransferResponse(
                concept=request.concept,
                question=llm_result.question.strip(),
                options=llm_result.options,
                underlying_concept=llm_result.underlying_concept.strip(),
            )
        except Exception:
            pass

    # Generic Safe Fallback
    generic = CURATED_TRANSFER_BANK["UNKNOWN"]
    return TransferResponse(
        concept=request.concept,
        question=generic["question"],
        options=generic["options"],
        underlying_concept=generic["underlying_concept"],
    )
