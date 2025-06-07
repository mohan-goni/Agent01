from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import os

from agent_logic import (
    chat_with_agent,
    load_chat_history,
    init_db as init_agent_db, # Keep alias if used consistently
    run_market_intelligence_agent
)
# Assuming agent_logic.py uses its own logger internally now.
# Vercel's build process should handle placing agent_logic.py where it can be imported directly.
# The PYTHONPATH in vercel.json might also assist if needed, but direct import is cleaner.


# Pydantic models for request and response
class ChatRequest(BaseModel):
    message: str
    session_id: str

class ChatResponse(BaseModel):
    response_text: str
    session_id: str

# Pydantic models for /run-analysis endpoint
class RunAnalysisRequest(BaseModel):
    query_str: str = Field(default="Market analysis of AI in Healthcare", description="Main query for the analysis.")
    market_domain_str: str = Field(default="AI in Healthcare", description="Target market domain.")
    question_str: Optional[str] = Field(default=None, description="Optional specific question for RAG about the generated report.")

class RunAnalysisResponse(BaseModel):
    success: bool
    state_id: Optional[str] = None
    query_response: Optional[str] = None
    report_dir_relative: Optional[str] = None
    report_filename: Optional[str] = None
    chart_filenames: List[str] = Field(default_factory=list) # Ensure it defaults to list
    data_json_filename: Optional[str] = None
    data_csv_filename: Optional[str] = None
    readme_filename: Optional[str] = None
    log_filename: Optional[str] = None
    rag_log_filename: Optional[str] = None
    vector_store_dirname: Optional[str] = None
    error: Optional[str] = None
    # warnings: Optional[str] = None # Not currently in agent_logic.py's return dict

app = FastAPI(
    title="Market Intelligence Agent API",
    description="API for interacting with the RAG Agent.",
    version="0.1.0",
)

# Configure basic logging for FastAPI app itself if needed, or rely on agent_logic's loggers
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO) # Or use agent_logger if preferred for consistency

# Initialize agent's database on startup
@app.on_event("startup")
async def startup_event():
    try:
        logger.info("FastAPI app startup: Initializing agent database...") # Use main.py's logger
        init_agent_db() # Initialize Agent.py's SQLite DB
        logger.info("Agent database initialization complete.") # Use main.py's logger
    except Exception as e:
        logger.error(f"FastAPI startup error during DB initialization: {e}") # Use main.py's logger
        # Depending on severity, you might want to prevent startup or handle gracefully
        # For now, just log it. Vercel might show this in deployment logs.

@app.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    logger.info(f"Received chat request for session_id: {request.session_id}") # Use main.py's logger
    try:
        # Agent.py handles its own history loading via session_id passed to chat_with_agent
        # The history from agent_logic.load_chat_history is passed to chat_with_agent
        history = load_chat_history(request.session_id)

        agent_response_text = chat_with_agent(
            message=request.message,
            session_id=request.session_id,
            history=history # Pass loaded history
        )

        if agent_response_text is None:
            logger.error(f"Agent returned None for session_id: {request.session_id}, message: {request.message}") # Use main.py's logger
            raise HTTPException(status_code=500, detail="Agent failed to produce a response.")

        logger.info(f"Successfully processed chat for session_id: {request.session_id}. Response generated.") # Use main.py's logger
        return ChatResponse(
            response_text=agent_response_text,
            session_id=request.session_id
        )
    except HTTPException as he: # Re-raise HTTPExceptions
        raise he
    except Exception as e:
        logger.error(f"Chat endpoint error for session_id {request.session_id}: {e}", exc_info=True) # Use main.py's logger
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")


@app.post("/run-analysis", response_model=RunAnalysisResponse)
async def handle_run_analysis(request: RunAnalysisRequest):
    logger.info(f"Received /run-analysis request: Query='{request.query_str}', Domain='{request.market_domain_str}', Question='{request.question_str or 'N/A'}'")
    try:
        # This is a synchronous call. For long-running tasks on Vercel:
        # - Hobby tier: max 10-15s.
        # - Pro/Enterprise: up to 5 min (but requires streaming responses for >60s, or background tasks).
        # If run_market_intelligence_agent is too long, it needs to be adapted for serverless.
        # For now, assume it completes within a reasonable timeframe for a standard request.

        result = run_market_intelligence_agent(
            query_str=request.query_str,
            market_domain_str=request.market_domain_str,
            question_str=request.question_str
        )

        # Ensure all fields in RunAnalysisResponse are populated from 'result'
        # The 'result' dict from run_market_intelligence_agent should align with RunAnalysisResponse fields.
        # Pydantic will validate this. If fields are missing from `result` that are not Optional
        # and don't have defaults in RunAnalysisResponse, it will error.
        return RunAnalysisResponse(**result)

    except Exception as e:
        error_detail = f"Error during full market analysis: {str(e)}"
        logger.error(error_detail, exc_info=True)
        # Return a structured error response matching RunAnalysisResponse
        return RunAnalysisResponse(
            success=False,
            error=error_detail,
            state_id=None,
            query_response=None,
            report_dir_relative=None,
            report_filename=None,
            chart_filenames=[],
            data_json_filename=None,
            data_csv_filename=None,
            readme_filename=None,
            log_filename=None,
            rag_log_filename=None,
            vector_store_dirname=None
        )

@app.get("/health", summary="Health Check", description="Simple health check endpoint.")
async def health_check():
    return {"status": "ok"}

# Optional: if you want to serve the agent_logic.py's DB or logs for debugging (NOT FOR PRODUCTION)
# from fastapi.staticfiles import StaticFiles
# app.mount("/agent_debug_logs", StaticFiles(directory="logs"), name="agent_logs")
# app.mount("/agent_debug_db", StaticFiles(directory="."), name="agent_db") # Be careful with this

if __name__ == "__main__":
    import uvicorn
    # This is for local development only.
    # On Vercel, the `vercel.json` and `@vercel/python` builder handle serving.
    print("Running FastAPI app locally with Uvicorn...")
    init_agent_db() # Ensure DB is init for local run
    uvicorn.run(app, host="0.0.0.0", port=8008) # Changed port to avoid conflict with Next.js
    # To run: cd api_python && python main.py OR uvicorn main:app --reload --port 8008
    # The Next.js app will proxy to this via vercel.json rewrites (even locally with `vercel dev`)
    # or directly if the Next.js app calls http://localhost:8008/chat
