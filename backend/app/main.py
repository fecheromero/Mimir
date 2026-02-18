from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.routes import test_cases, jobs

settings = get_settings()

app = FastAPI(
    title="Mimir API",
    description="AI-Powered QA Testing Platform",
    version="1.0.0",
)

# CORS middleware
origins = [
    "http://localhost:3000",
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


# Include routers
app.include_router(test_cases.router, prefix="/api/test-cases", tags=["test-cases"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
