"""FastAPI dependencies — Gemini client and taxonomy injection."""

from functools import lru_cache
from fastapi import HTTPException
from google import genai

from app.config import settings
from app.taxonomy.service import TaxonomyService, get_taxonomy_service


class LLMService:
    """Service abstraction over google-genai Client."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = settings.gemini_api_key if api_key is None else api_key
        self.model = model or settings.gemini_model
        if not self.api_key:
            self._client = None
        else:
            self._client = genai.Client(api_key=self.api_key)

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable.",
            )
        return self._client


@lru_cache()
def get_llm_service() -> LLMService:
    """Return a cached LLMService instance."""
    return LLMService()


def get_gemini_client() -> genai.Client:
    """FastAPI dependency for accessing the initialized Gemini client."""
    return get_llm_service().client


def get_optional_gemini_client() -> genai.Client | None:
    """FastAPI dependency for accessing the Gemini client if available, else None."""
    try:
        return get_llm_service().client
    except Exception:
        return None


def get_taxonomy() -> TaxonomyService:
    """FastAPI dependency for accessing the TaxonomyService singleton."""
    return get_taxonomy_service()
