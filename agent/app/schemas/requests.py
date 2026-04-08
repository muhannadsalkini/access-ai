from pydantic import BaseModel
from typing import Optional


class AffectedElement(BaseModel):
    """An HTML element affected by an accessibility violation."""
    selector: str
    html: str
    failureSummary: str = ""


class AxeViolation(BaseModel):
    """A single accessibility violation from axe-core."""
    ruleId: str
    impact: str
    description: str
    help: str = ""
    helpUrl: str = ""
    tags: list[str] = []
    affectedElements: list[AffectedElement] = []


class AnalyzeRequest(BaseModel):
    """Request body for the /agent/analyze endpoint."""
    url: str
    scan_id: str
    violations: list[AxeViolation]


class ChatMessage(BaseModel):
    """A single chat message in a conversation."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request body for the /agent/chat endpoint."""
    url: str
    score: int
    summary: str
    issues_text: str
    message: str
    conversation_history: list[ChatMessage] = []
