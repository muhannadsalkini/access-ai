"""AccessAI Agent — Google ADK agent for web accessibility analysis."""

import json
import os
from google import genai
from google.genai import types

from app.config import get_settings
from app.agent.prompts import SYSTEM_INSTRUCTION, ANALYSIS_PROMPT_TEMPLATE
from app.schemas.requests import AnalyzeRequest
from app.schemas.responses import AnalyzeResponse, AnalyzedIssue


def _format_violations(violations) -> str:
    """Format axe-core violations into a readable text for the agent."""
    if not violations:
        return "No violations detected."

    parts = []
    for i, v in enumerate(violations, 1):
        elements = "\n".join(
            f"    - Selector: {el.selector}\n      HTML: {el.html}\n      Issue: {el.failureSummary}"
            for el in v.affectedElements
        )
        parts.append(
            f"""Violation {i}:
  Rule: {v.ruleId}
  Impact: {v.impact}
  Description: {v.description}
  Help: {v.help}
  Help URL: {v.helpUrl}
  WCAG Tags: {', '.join(v.tags)}
  Affected Elements:
{elements}"""
        )

    return "\n\n".join(parts)


async def analyze_accessibility(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Run the AI agent to analyze accessibility violations.

    Uses Google Gemini to classify severity, generate explanations,
    and produce code-level fix recommendations.
    """
    settings = get_settings()

    # Configure the Gemini client
    client = genai.Client(api_key=settings.google_api_key)

    # Format the violations for the prompt
    violations_text = _format_violations(request.violations)

    # Build the analysis prompt
    prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        url=request.url,
        violation_count=len(request.violations),
        violations_text=violations_text,
    )

    # Call Gemini
    response = client.models.generate_content(
        model="gemini-2.0-flash",
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
