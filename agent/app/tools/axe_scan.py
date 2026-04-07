"""Tool: run_axe_scan — Runs axe-core scan via the backend service."""

import httpx
from app.config import get_settings


async def run_axe_scan(url: str) -> dict:
    """
    Runs axe-core accessibility rules against the loaded page via the backend
    and returns a structured list of violations.

    Args:
        url: The website URL to scan.

    Returns:
        A dict with scan results or an error message.
    """
    settings = get_settings()
    backend_url = f"{settings.backend_service_url}/api/internal/axe-scan"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(backend_url, json={"url": url})
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        return {"error": f"Failed to run axe scan: {str(e)}"}
