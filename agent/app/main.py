from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routes.scan import router as scan_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings = get_settings()
    print(f"🤖 AccessAI Agent starting...")
    print(f"🔗 Backend service: {settings.backend_service_url}")
    print(f"🧠 Google AI configured: {'Yes' if settings.google_api_key else 'No'}")
    yield
    print("🤖 AccessAI Agent shutting down...")


app = FastAPI(
    title="AccessAI Agent",
    description="AI-powered web accessibility analysis agent using Google ADK and Gemini",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "accessai-agent",
    }


# Register routes
app.include_router(scan_router, prefix="/agent", tags=["agent"])
