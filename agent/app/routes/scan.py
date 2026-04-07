"""Agent scan route — POST /agent/analyze."""

from fastapi import APIRouter, HTTPException
from app.schemas.requests import AnalyzeRequest
from app.schemas.responses import AnalyzeResponse
from app.agent.accessibility_agent import analyze_accessibility

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Analyze accessibility violations using the AI agent.

    Receives axe-core scan results from the backend, processes them
    through the Gemini-powered agent, and returns enriched analysis
    with severity classifications, explanations, and fix recommendations.
    """
    try:
        result = await analyze_accessibility(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent analysis failed: {str(e)}",
        )
