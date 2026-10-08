from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.data.database import init_db
from app.data.seed import seed_database
from app.core.response import success_response, error_response

# Routers
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.plans import router as plans_router
from app.api.subscriptions import router as subscriptions_router
from app.api.usage import router as usage_router
from app.api.recharges import router as recharges_router
from app.api.bills import router as bills_router
from app.api.sims import router as sims_router
from app.api.network import router as network_router
from app.api.tickets import router as tickets_router
from app.api.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    init_db()
    # Seed with demo telecom data (Alice, Bob, Admin, 5G plans, outages)
    seed_database(force=False)
    yield

app = FastAPI(
    title="AI Telecom Customer Support & Service Management Platform",
    description="FastAPI-powered autonomous AI agent for telecom operations, 5G diagnostics, and service management.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check
@app.get("/api/health")
def health_check():
    return success_response({"status": "healthy", "service": "fastapi-telecom-ai-agent"})

# Exception Handlers ensuring { data, error } envelope
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"data": None, "error": str(exc.detail)}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = errors[0]["msg"] if errors else "Validation error"
    return JSONResponse(
        status_code=422,
        content={"data": None, "error": msg}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"data": None, "error": str(exc)}
    )

# Mount API Routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(plans_router)
app.include_router(subscriptions_router)
app.include_router(usage_router)
app.include_router(recharges_router)
app.include_router(bills_router)
app.include_router(sims_router)
app.include_router(network_router)
app.include_router(tickets_router)
app.include_router(admin_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
