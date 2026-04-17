import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routes.scan import router as scan_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings = get_settings()
    print(f"🤖 AccessAI Agent starting...")
    print(f"🔗 Backend service: {settings.backend_service_url}")
    print(f"🧠 Google AI configured: {'Yes' if settings.google_api_key else 'No'}")
    print(f"🔐 Internal secret configured: {'Yes' if settings.internal_secret else 'No (INSECURE — set INTERNAL_SECRET)'}")
    yield
    print("🤖 AccessAI Agent shutting down...")


app = FastAPI(
    title="AccessAI Agent",
    description="AI-powered web accessibility analysis agent using Google ADK and Gemini",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Internal Secret Authentication Middleware
# ---------------------------------------------------------------------------
# All /agent/* endpoints require the X-Internal-Secret header to match the
# INTERNAL_SECRET environment variable.  Only the backend (which knows the
# secret) is allowed to call this service.  The /health endpoint is exempt.
# ---------------------------------------------------------------------------

@app.middleware("http")
async def verify_internal_secret(request: Request, call_next):
    """Reject requests that don't carry the correct X-Internal-Secret header."""
    # Allow health checks through without authentication
    if request.url.path == "/health":
        return await call_next(request)

    settings = get_settings()

    # If no secret is configured, warn loudly but still allow the request so
    # development without a secret continues to work.  In production the
    # secret MUST be set.
    if not settings.internal_secret:
        logger.warning(
            "INTERNAL_SECRET is not configured — agent is running without "
            "authentication.  Set INTERNAL_SECRET in production!"
        )
        return await call_next(request)

    provided_secret = request.headers.get("X-Internal-Secret", "")
    if provided_secret != settings.internal_secret:
        logger.warning(
            "Rejected request to %s — invalid or missing X-Internal-Secret",
            request.url.path,
        )
        return JSONResponse(
            status_code=401,
            content={"error": "Unauthorized: invalid or missing internal secret."},
        )

    return await call_next(request)


# ---------------------------------------------------------------------------
# CORS — restrict to the backend service URL only
# ---------------------------------------------------------------------------

def _get_allowed_origins() -> list[str]:
    settings = get_settings()
    origins = [settings.backend_service_url]
    # Always allow localhost variants during local development
    origins += [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type", "X-Internal-Secret"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Register routes
app.include_router(scan_router, prefix="/agent", tags=["agent"])
