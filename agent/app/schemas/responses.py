from pydantic import BaseModel


class AnalyzedIssue(BaseModel):
    """A single accessibility issue analyzed by the AI agent."""
    issue_type: str
    severity: str  # critical, serious, moderate, minor
    description: str
    recommendation: str
    wcag_reference: str


class AnalyzeResponse(BaseModel):
    """Response body from the /agent/analyze endpoint."""
    summary: str
    priority_recommendations: str
    issues: list[AnalyzedIssue]
    accessibility_score: int  # 0-100


class ChatResponse(BaseModel):
    """Response body from the /agent/chat endpoint."""
    response: str
