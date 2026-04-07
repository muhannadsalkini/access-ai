"""Tool: save_to_database — Persists results to Supabase."""

from app.config import get_settings


async def save_to_database(scan_id: str, report: dict) -> dict:
    """
    Persists the generated report and all issue records to the
    Supabase database linked to the given scan ID.

    Note: In the current architecture, the backend handles database
    persistence. This tool is available for the agent to use if needed
    for direct database operations.

    Args:
        scan_id: The scan ID to associate results with.
        report: The generated report dict.

    Returns:
        A status dict indicating success or failure.
    """
    try:
        from supabase import create_client

        settings = get_settings()
        supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

        # Save report
        report_data = {
            "scan_id": scan_id,
            "summary": report.get("summary", ""),
            "priority_recommendations": report.get("priority_recommendations", ""),
        }
        supabase.table("reports").insert(report_data).execute()

        # Save issues
        issues = report.get("issues", [])
        if issues:
            issue_records = [
                {
                    "scan_id": scan_id,
                    "issue_type": issue.get("issue_type", ""),
                    "severity": issue.get("severity", ""),
                    "description": issue.get("description", ""),
                    "recommendation": issue.get("recommendation", ""),
                    "wcag_reference": issue.get("wcag_reference", ""),
                }
                for issue in issues
            ]
            supabase.table("issues").insert(issue_records).execute()

        return {"status": "success", "scan_id": scan_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}
