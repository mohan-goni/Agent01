from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import structlog
from pydantic_settings import BaseSettings
import re
import os
from agent_logic import (
    chat_with_agent,
    load_chat_history,
    init_db as init_agent_db,
    run_market_intelligence_agent
)

# Environment variable configuration
class Settings(BaseSettings):
    DATABASE_URL: str
    NEXT_PUBLIC_SUPABASE_URL: str
    NEXT_PUBLIC_SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    AUTH_SECRET: str
    AUTH_URL: str
    PYTHON_AGENT_API_BASE_URL: str
    GOOGLE_API_KEY: str
    TAVILY_API_KEY: str
    SERPAPI_API_KEY: str
    GNEWS_API_KEY: str
    NEWS_API_KEY: str
    FINANCIAL_MODELING_PREP_API_KEY: str # Changed from fmp_api_key
    ALPHA_VANTAGE_API_KEY: str
    MEDIASTACK_API_KEY: str # Added
    EMAIL_SERVICE_API_KEY: str
    EMAIL_FROM: str

    class Config:
        env_file = "../.env.local"
        env_file_encoding = "utf-8"

# Initialize settings and logger
try:
    settings = Settings()
except Exception as e:
    print(f"Failed to load environment variables: {str(e)}")
    exit(1)

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger()

# Set default USER_AGENT
os.environ.setdefault("USER_AGENT", "MarketIntelligenceAgent/1.0 (+http://example.com/botinfo)")

# Pydantic models
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, description="User's message to the agent")
    session_id: str = Field(min_length=1, max_length=50, description="Unique session identifier")

    @field_validator('session_id')
    @classmethod
    def validate_session_id(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_-]{1,50}$', v):
            raise ValueError("Session ID must contain only letters, numbers, underscores, or hyphens")
        return v

class ChatResponse(BaseModel):
    response_text: str
    session_id: str

class RunAnalysisRequest(BaseModel):
    query_str: str = Field(default="Market analysis of AI in Healthcare", description="Main query for the analysis")
    market_domain_str: str = Field(default="AI in Healthcare", description="Target market domain")
    question_str: Optional[str] = Field(default=None, description="Optional specific question for RAG")

class RunAnalysisResponse(BaseModel):
    success: bool
    state_id: Optional[str] = None
    query_response: Optional[str] = None
    report_dir_relative: Optional[str] = None
    report_filename: Optional[str] = None
    chart_filenames: List[str] = Field(default_factory=list)
    data_json_filename: Optional[str] = None
    data_csv_filename: Optional[str] = None
    readme_filename: Optional[str] = None
    log_filename: Optional[str] = None
    rag_log_filename: Optional[str] = None
    vector_store_dirname: Optional[str] = None
    error: Optional[str] = None

app = FastAPI(
    title="Market Intelligence Agent API",
    description="API for interacting with the RAG Agent using ChromaDB",
    version="0.1.0",
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI app startup: Initializing agent database")
    try:
        init_agent_db()
        logger.info("Agent database initialization complete")
    except Exception as e:
        logger.error("Failed to initialize database", exc_info=e)
        raise

@app.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    logger.info("Received chat request", session_id=request.session_id)
    try:
        if not request.message.strip():
            logger.warning("Empty message received", session_id=request.session_id)
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        history = load_chat_history(request.session_id)
        agent_response_text = await chat_with_agent(
            message=request.message,
            session_id=request.session_id,
            history=history
        )
        if not agent_response_text:
            logger.error("Agent returned empty response", session_id=request.session_id)
            raise HTTPException(status_code=500, detail="Agent failed to produce a response")
        logger.info("Chat processed", session_id=request.session_id)
        if agent_response_text == "Sorry, I encountered an error while processing your message.":
            # This specific string is returned by chat_with_agent on internal errors
            raise HTTPException(status_code=503, detail=agent_response_text)
        return ChatResponse(
            response_text=agent_response_text,
            session_id=request.session_id
        )
    except HTTPException as he:
        raise he
    except ValueError as ve: # Catch specific ValueErrors, e.g. API key not set
        logger.error("Chat endpoint configuration error", session_id=request.session_id, exc_info=ve)
        raise HTTPException(status_code=503, detail=f"Service configuration error: {str(ve)}")
    except Exception as e:
        logger.error("Chat endpoint error", session_id=request.session_id, exc_info=e)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/run-analysis", response_model=RunAnalysisResponse)
async def handle_run_analysis(request: RunAnalysisRequest):
    logger.info(
        "Received /run-analysis request",
        query=request.query_str,
        domain=request.market_domain_str,
        question=request.question_str or "N/A"
    )
    try:
        result = await run_market_intelligence_agent(
            query=request.query_str.strip(),
            domain=request.market_domain_str.strip(),
            question=request.question_str.strip() if request.question_str else None
        )
        return RunAnalysisResponse(**result)
    except Exception as e:
        logger.error("Run analysis failed", exc_info=e)
        return RunAnalysisResponse(
            success=False,
            error=f"Error during market analysis: {str(e)}",
        )

@app.get("/health", summary="Health Check")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Running FastAPI app locally with Uvicorn")
    init_agent_db()
    uvicorn.run(app, host="0.0.0.0", port=8000)


