"""Shared test fixtures for FIXXY Brain tests."""

import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    """Set environment variables for testing (no real API key needed)."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-fake-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    monkeypatch.setenv("DATABASE_URL", "")


@pytest.fixture
def mock_gemini_client():
    """Create a mock Gemini client that returns controlled responses."""
    client = MagicMock()
    client.aio = MagicMock()
    client.aio.models = MagicMock()
    client.aio.models.generate_content = AsyncMock()
    return client


@pytest.fixture
def test_client():
    """Create a FastAPI TestClient with mocked Gemini dependency."""
    from app.main import app
    from app.dependencies import get_gemini_client

    mock_client = MagicMock()
    mock_client.aio = MagicMock()
    mock_client.aio.models = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock()

    app.dependency_overrides[get_gemini_client] = lambda: mock_client

    with TestClient(app) as tc:
        yield tc, mock_client

    app.dependency_overrides.clear()
