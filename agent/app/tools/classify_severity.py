"""Tool: classify_severity — Classifies severity of accessibility issues."""


def classify_severity(issues: list[dict]) -> list[dict]:
    """
    Assigns severity levels (critical, serious, moderate, minor) to each
    detected issue based on WCAG impact criteria.

    This is primarily handled by the Gemini model's reasoning, but this
    tool provides a fallback classification based on axe-core impact levels.

    Args:
        issues: List of issue dicts with at least an 'impact' field.

    Returns:
        The same issues list with normalized severity levels.
    """
    severity_map = {
        "critical": "critical",
        "serious": "serious",
        "moderate": "moderate",
        "minor": "minor",
        "unknown": "moderate",
    }

    for issue in issues:
        impact = issue.get("impact", "unknown").lower()
        issue["severity"] = severity_map.get(impact, "moderate")

    return issues
