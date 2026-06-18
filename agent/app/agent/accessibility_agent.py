"""AccessAI Agent — Google ADK agent for web accessibility analysis."""

import json
import os
import re
import asyncio
import queue
import threading
from typing import AsyncGenerator
from google import genai
from google.genai import types

from app.config import get_settings
from app.agent.prompts import (
    SYSTEM_INSTRUCTION,
    ANALYSIS_PROMPT_TEMPLATE,
    STREAM_ANALYSIS_PROMPT_TEMPLATE,
    CHAT_SYSTEM_INSTRUCTION,
    CHAT_PROMPT_TEMPLATE,
)
from app.schemas.requests import AnalyzeRequest, ChatRequest
from app.schemas.responses import AnalyzeResponse, AnalyzedIssue, ChatResponse

# ---------------------------------------------------------------------------
# Prompt injection sanitization helpers
# ---------------------------------------------------------------------------
# User-controlled values (URLs, HTML snippets, titles, user messages) must be
# sanitized before they are interpolated into AI prompts.  Without this, an
# attacker could embed instructions in a page title or HTML element that
# manipulate the model's output.
# ---------------------------------------------------------------------------

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Maximum character budget for the total violations_text block.
_MAX_VIOLATIONS_TEXT_CHARS = 50_000
# Per-field limits inside a single violation element.
_MAX_SELECTOR_CHARS = 300
_MAX_HTML_CHARS = 500
_MAX_FAILURE_SUMMARY_CHARS = 500
# URL / title length caps.
_MAX_URL_CHARS = 500
_MAX_TITLE_CHARS = 100


def _sanitize_url(url: str) -> str:
    """Strip control characters and newlines from a URL; truncate."""
    if not url:
        return ""
    url = _CONTROL_CHAR_RE.sub("", url)
    url = url.replace("\n", " ").replace("\r", " ")
    return url[:_MAX_URL_CHARS]


def _sanitize_text(text: str, max_len: int) -> str:
    """Strip HTML tags and control characters from a text field; truncate."""
    if not text:
        return ""
    text = _HTML_TAG_RE.sub("", text)
    text = _CONTROL_CHAR_RE.sub("", text)
    text = text.replace("\n", " ").replace("\r", " ")
    return text[:max_len]


def _format_violations(violations) -> str:
    """Format axe-core violations into a readable text for the agent.

    All user-controlled fields (selector, HTML snippet, failure summary) are
    sanitized to prevent prompt injection before being included in the prompt.
    The combined output is capped at _MAX_VIOLATIONS_TEXT_CHARS characters.
    """
    if not violations:
        return "No violations detected."

    parts = []
    for i, v in enumerate(violations, 1):
        elements = "\n".join(
            f"    - Selector: {_sanitize_text(el.selector, _MAX_SELECTOR_CHARS)}\n"
            f"      HTML: {_sanitize_text(el.html, _MAX_HTML_CHARS)}\n"
            f"      Issue: {_sanitize_text(el.failureSummary, _MAX_FAILURE_SUMMARY_CHARS)}"
            for el in v.affectedElements
        )
        parts.append(
            f"""Violation {i}:
  Rule: {_sanitize_text(v.ruleId, 100)}
  Impact: {_sanitize_text(v.impact, 50)}
  Description: {_sanitize_text(v.description, 300)}
  Help: {_sanitize_text(v.help, 300)}
  Help URL: {_sanitize_url(v.helpUrl)}
  WCAG Tags: {', '.join(_sanitize_text(t, 50) for t in v.tags)}
  Affected Elements:
{elements}"""
        )

    result = "\n\n".join(parts)
    # Hard cap on total violations block to prevent context-window overflow.
    if len(result) > _MAX_VIOLATIONS_TEXT_CHARS:
        result = result[:_MAX_VIOLATIONS_TEXT_CHARS] + "\n\n[... truncated for length ...]"
    return result


async def analyze_accessibility(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Run the AI agent to analyze accessibility violations.

    Uses Google Gemini to classify severity, generate explanations,
    and produce code-level fix recommendations.
    """
    settings = get_settings()

    # Configure the Gemini client
    client = genai.Client(api_key=settings.google_api_key)

    # Sanitize user-controlled URL before interpolating into prompt
    safe_url = _sanitize_url(request.url)

    # Format the violations for the prompt
    violations_text = _format_violations(request.violations)

    # Build the analysis prompt
    prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        url=safe_url,
        violation_count=len(request.violations),
        violations_text=violations_text,
    )

    # Call Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    # Parse the JSON response
    try:
        result = json.loads(response.text)
    except json.JSONDecodeError:
        # If JSON parsing fails, try to extract JSON from the response
        text = response.text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            result = json.loads(text[start:end])
        else:
            # Fallback: create a basic response
            result = {
                "summary": "Analysis completed but response format was unexpected.",
                "priority_recommendations": "Please review the raw scan results.",
                "accessibility_score": 50,
                "issues": [],
            }

    # Build the response
    issues = [
        AnalyzedIssue(
            issue_type=issue.get("issue_type", "Unknown"),
            severity=issue.get("severity", "moderate"),
            description=issue.get("description", ""),
            recommendation=issue.get("recommendation", ""),
            wcag_reference=issue.get("wcag_reference", ""),
        )
        for issue in result.get("issues", [])
    ]

    # If no issues were returned by AI but violations exist, create basic issues
    if not issues and request.violations:
        issues = [
            AnalyzedIssue(
                issue_type=v.description,
                severity=v.impact if v.impact in ["critical", "serious", "moderate", "minor"] else "moderate",
                description=f"{v.description}. {v.help}",
                recommendation=f"See {v.helpUrl} for guidance on fixing this issue.",
                wcag_reference=", ".join(tag for tag in v.tags if tag.startswith("wcag")),
            )
            for v in request.violations
        ]

    return AnalyzeResponse(
        summary=result.get("summary", ""),
        priority_recommendations=result.get("priority_recommendations", ""),
        issues=issues,
        accessibility_score=max(0, min(100, result.get("accessibility_score", 50))),
    )


async def chat_about_scan(request: ChatRequest) -> ChatResponse:
    """
    Chat with the AI agent about scan results.

    Uses Google Gemini with conversation history and scan context
    to provide helpful follow-up answers about accessibility fixes.
    """
    settings = get_settings()
    client = genai.Client(api_key=settings.google_api_key)

    # Sanitize user-controlled fields before interpolating into the prompt
    safe_url = _sanitize_url(request.url)
    safe_message = _sanitize_text(request.message, 2000)

    # Format conversation history
    history_text = ""
    if request.conversation_history:
        history_parts = []
        for msg in request.conversation_history:
            role_label = "User" if msg.role == "user" else "Assistant"
            history_parts.append(f"{role_label}: {msg.content}")
        history_text = "\n\n".join(history_parts)
    else:
        history_text = "(No previous conversation)"

    # Build the chat prompt
    prompt = CHAT_PROMPT_TEMPLATE.format(
        url=safe_url,
        score=request.score,
        summary=request.summary,
        issues_text=request.issues_text,
        conversation_history=history_text,
        user_message=safe_message,
    )

    # Call Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=CHAT_SYSTEM_INSTRUCTION,
            temperature=0.3,
        ),
    )

    return ChatResponse(response=response.text or "I could not generate a response. Please try again.")


async def chat_about_scan_stream(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Stream chat response tokens from Gemini as an async generator.

    Uses a background thread to run the synchronous Gemini streaming API
    so it doesn't block the async event loop, allowing FastAPI to flush
    SSE events to the client in real-time.
    """
    settings = get_settings()
    client = genai.Client(api_key=settings.google_api_key)

    # Sanitize user-controlled fields before interpolating into the prompt
    safe_url = _sanitize_url(request.url)
    safe_message = _sanitize_text(request.message, 2000)

    # Format conversation history
    history_text = ""
    if request.conversation_history:
        history_parts = []
        for msg in request.conversation_history:
            role_label = "User" if msg.role == "user" else "Assistant"
            history_parts.append(f"{role_label}: {msg.content}")
        history_text = "\n\n".join(history_parts)
    else:
        history_text = "(No previous conversation)"

    # Build the chat prompt
    prompt = CHAT_PROMPT_TEMPLATE.format(
        url=safe_url,
        score=request.score,
        summary=request.summary,
        issues_text=request.issues_text,
        conversation_history=history_text,
        user_message=safe_message,
    )

    # Use a thread-safe queue to bridge sync Gemini streaming → async generator
    chunk_queue: queue.Queue = queue.Queue()
    _SENTINEL = object()

    def _run_sync_stream():
        """Run the synchronous Gemini streaming in a background thread."""
        try:
            response = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=CHAT_SYSTEM_INSTRUCTION,
                    temperature=0.3,
                ),
            )
            for chunk in response:
                if chunk.text:
                    chunk_queue.put(chunk.text)
        except Exception as e:
            chunk_queue.put(e)
        finally:
            chunk_queue.put(_SENTINEL)

    # Start the sync streaming in a background thread
    thread = threading.Thread(target=_run_sync_stream, daemon=True)
    thread.start()

    # Yield chunks from the queue as they arrive
    loop = asyncio.get_event_loop()
    while True:
        # Non-blocking get from queue using executor
        item = await loop.run_in_executor(None, chunk_queue.get)
        if item is _SENTINEL:
            break
        if isinstance(item, Exception):
            raise item
        yield item


# ---------------------------------------------------------------------------
# Streaming analyze — yields NDJSON records (one JSON object per line)
# ---------------------------------------------------------------------------


async def analyze_accessibility_stream(
    request: AnalyzeRequest,
) -> AsyncGenerator[str, None]:
    """
    Run the AI agent in streaming mode.

    Prompts Gemini to emit NDJSON (one JSON record per line) and yields each
    complete line as soon as it arrives.  The caller (the FastAPI route) is
    responsible for forwarding those lines to its client.

    The first line is a "summary" record, followed by one "issue" record per
    violation.  Scoring is done deterministically by the backend, not the LLM.
    """
    settings = get_settings()
    client = genai.Client(api_key=settings.google_api_key)

    # Sanitize user-controlled URL before interpolating into prompt
    safe_url = _sanitize_url(request.url)

    violations_text = _format_violations(request.violations)

    prompt = STREAM_ANALYSIS_PROMPT_TEMPLATE.format(
        url=safe_url,
        violation_count=len(request.violations),
        violations_text=violations_text,
    )

    # Bridge the sync Gemini streaming API → async via a thread-safe queue.
    chunk_queue: queue.Queue = queue.Queue()
    _SENTINEL = object()

    def _run_sync_stream():
        try:
            response = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2,
                ),
            )
            for chunk in response:
                if chunk.text:
                    chunk_queue.put(chunk.text)
        except Exception as e:
            chunk_queue.put(e)
        finally:
            chunk_queue.put(_SENTINEL)

    thread = threading.Thread(target=_run_sync_stream, daemon=True)
    thread.start()

    # Buffer partial chunks and emit one full line at a time.
    loop = asyncio.get_event_loop()
    buffer = ""
    while True:
        item = await loop.run_in_executor(None, chunk_queue.get)
        if item is _SENTINEL:
            break
        if isinstance(item, Exception):
            raise item

        buffer += item
        # Split on newline, keep last partial line in the buffer.
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            line = line.strip()
            # Strip stray markdown code-fence artefacts if the model sneaks them in.
            if line.startswith("```"):
                continue
            if not line:
                continue
            # Validate it's JSON; drop non-JSON lines rather than crashing.
            try:
                json.loads(line)
            except Exception:
                continue
            yield line

    # Flush any trailing line that didn't end with \n.
    tail = buffer.strip()
    if tail and not tail.startswith("```"):
        try:
            json.loads(tail)
            yield tail
        except Exception:
            pass

