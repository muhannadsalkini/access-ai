"""Tool: fetch_page_html — Fetches rendered HTML from a URL via the backend service."""

import httpx
from app.config import get_settings


async def fetch_page_html(url: str) -> dict:
    """
    Loads the target webpage using the backend's Playwright service
    and returns the rendered HTML content for analysis.

    Args:
        url: The website URL to fetch.

    Returns:
        A dict with the page HTML content or an error message.
    """
    settings = get_settings()
    backend_url = f"{settings.backend_service_url}/api/internal/fetch-html"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(backend_url, json={"url": url})
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        return {"error": f"Failed to fetch page HTML: {str(e)}"}
