"""Agent scan route — POST /agent/analyze, POST /agent/chat, POST /agent/chat/stream."""

import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.requests import AnalyzeRequest, ChatRequest
from app.schemas.responses import AnalyzeResponse, ChatResponse
from app.agent.accessibility_agent import analyze_accessibility, chat_about_scan, chat_about_scan_stream

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


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Chat with the AI agent about scan results.

    Receives the user's question along with scan context and conversation
    history, and returns the AI agent's response.
    """
    try:
        result = await chat_about_scan(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent chat failed: {str(e)}",
        )


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat response as Server-Sent Events.

    Each SSE event contains a JSON object with either:
    - {"text": "chunk..."} for partial content
    - {"done": true, "full_text": "..."} for completion
    """
    async def event_generator():
        full_text = ""
        try:
            async for chunk in chat_about_scan_stream(request):
                full_text += chunk
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            # Send completion event
            yield f"data: {json.dumps({'done': True, 'full_text': full_text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
