"""Tool: generate_report — Generates the final accessibility report."""


def generate_report(issues: list[dict]) -> dict:
    """
    Produces the final structured accessibility report with explanations,
    prioritized fixes, and WCAG references for each issue.

    This is a helper that structures the agent's analysis into the final
    report format. The actual analysis is done by the Gemini model.

    Args:
        issues: List of analyzed issue dicts.

    Returns:
        A structured report dict.
    """
    # Sort issues by severity priority
    severity_order = {"critical": 0, "serious": 1, "moderate": 2, "minor": 3}
    sorted_issues = sorted(
        issues,
        key=lambda x: severity_order.get(x.get("severity", "moderate"), 2)
    )

    # Count by severity
    severity_counts = {}
    for issue in sorted_issues:
        sev = issue.get("severity", "moderate")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Calculate score
    score = 100
    for issue in sorted_issues:
        sev = issue.get("severity", "moderate")
        if sev == "critical":
            score -= 15
        elif sev == "serious":
            score -= 10
        elif sev == "moderate":
            score -= 5
        elif sev == "minor":
            score -= 2
    score = max(0, score)

    # Build summary
    summary_parts = [f"Found {len(sorted_issues)} accessibility issues."]
    for sev in ["critical", "serious", "moderate", "minor"]:
        count = severity_counts.get(sev, 0)
        if count > 0:
            summary_parts.append(f"{count} {sev}")

    return {
        "issues": sorted_issues,
        "accessibility_score": score,
        "summary": " ".join(summary_parts),
        "severity_counts": severity_counts,
    }
