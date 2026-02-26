from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.routes import test_cases, jobs, pr_reviews, qa_run_history

settings = get_settings()

app = FastAPI(
    title="Mimir API",
    description="AI-Powered QA Testing Platform",
    version="1.0.0",
)

# CORS middleware
origins = [
    "http://localhost:3000",
    "http://localhost:3023",
    "http://localhost:5173",  # Vite dev server
]

# Add production frontend URL if configured
if settings.frontend_url:
    # Ensure URL has protocol
    frontend_url = settings.frontend_url
    if not frontend_url.startswith(("http://", "https://")):
        frontend_url = f"https://{frontend_url}"

    if frontend_url not in origins:
        origins.append(frontend_url)

print(f"🔧 CORS enabled for origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "Mimir API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/debug/cors")
async def debug_cors():
    """Debug endpoint to check CORS configuration."""
    return {
        "configured_origins": origins,
        "frontend_url_env": settings.frontend_url,
        "cors_enabled": True,
    }


@app.get("/debug/env")
async def debug_env():
    """Debug endpoint to check environment configuration."""
    return {
        "llm_provider": settings.llm_provider,
        "anthropic_api_key_set": bool(settings.anthropic_api_key),
        "anthropic_api_key_prefix": settings.anthropic_api_key[:15] if settings.anthropic_api_key else None,
        "openai_api_key_set": bool(settings.openai_api_key),
        "openai_api_key_prefix": settings.openai_api_key[:15] if settings.openai_api_key else None,
        "redis_url": settings.redis_url.split('@')[-1] if '@' in settings.redis_url else settings.redis_url,  # Hide password
        "browser_execution_mode": settings.browser_execution_mode,
        "test_case_agent_model": settings.test_case_agent_model,
        "qa_agent_model": settings.qa_agent_model,
    }


# Include routers
app.include_router(test_cases.router, prefix="/api/test-cases", tags=["test-cases"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(pr_reviews.router, prefix="/api/pr-reviews", tags=["pr-reviews"])
app.include_router(qa_run_history.router, prefix="/api/qa-run-history", tags=["qa-run-history"])
