"""Top-level entry point to run live evaluation against Gemini API."""

import asyncio
from tests.evaluation.live_eval import main

if __name__ == "__main__":
    asyncio.run(main())
