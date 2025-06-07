import os
import json
import csv
import sqlite3
import logging
import shutil
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from uuid import uuid4
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator
from langchain.chat_models import init_chat_model # Assuming this resolves correctly in user's environment
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from cachetools import TTLCache
import traceback
import argparse # For CLI execution in __main__

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    handlers=[
        logging.FileHandler('market_intelligence.log', mode='a'), # Append mode
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

error_logger = logging.getLogger('agent_error_specific_logger') # Unique name
error_file_handler = logging.FileHandler('market_intelligence_errors.log', mode='a') # Append mode
error_file_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(name)s - %(message)s'))
error_logger.addHandler(error_file_handler)
error_logger.setLevel(logging.ERROR)
error_logger.propagate = False

try:
    from generate_charts import export as generate_charts_export # Renamed import
except ImportError:
    logger.info("generate_charts module not found, using fallback for chart generation.")
    def generate_charts_export(data: Dict[str, Any], output_dir: str) -> List[str]: # Renamed function
        logger.info(f"Chart Generation Fallback: Called for output_dir: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)
        default_chart_filenames_list = ["market_growth.png", "competitor_share.png", "trend_impact.png"]
        created_placeholder_charts = []
        for chart_filename_item in default_chart_filenames_list:
            placeholder_chart_path = os.path.join(output_dir, chart_filename_item)
            try:
                with open(placeholder_chart_path, "w", encoding="utf-8") as f_chart:
                    f_chart.write(f"Placeholder for {chart_filename_item}")
                logger.info(f"Chart Generation Fallback: Created placeholder chart: {placeholder_chart_path}")
                created_placeholder_charts.append(chart_filename_item)
            except Exception as e_chart_fb:
                error_logger.error(f"Chart Generation Fallback: Failed to create placeholder chart {placeholder_chart_path}: {e_chart_fb}")
        return created_placeholder_charts

if "USER_AGENT" not in os.environ: # Check before setting
    os.environ["USER_AGENT"] = "MarketIntelligenceAgent/1.0 (+http://example.com/botinfo)"
    logger.info(f"Default USER_AGENT for WebBaseLoader set to: {os.environ['USER_AGENT']}")

load_dotenv() # Load .env file into environment variables

search_results_cache = TTLCache(maxsize=100, ttl=3600) # Renamed for clarity

def init_db():
    db_name = 'market_intelligence_agent.db' # Specific DB name
    db_path = "" # Initialize to ensure it's in scope for logging
    try:
        if os.environ.get("VERCEL_ENV"):
            db_path = os.path.join("/tmp", db_name)
            logger.info(f"Using Vercel /tmp path for database: {db_path}")
        else:
            # For local, place it inside api_python to keep project root clean
            api_python_dir = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.join(api_python_dir, db_name)
            logger.info(f"Using local path for database: {db_path}")

        conn = sqlite3.connect(db_path)
        cursor_obj = conn.cursor() # Renamed
        cursor_obj.execute('''
            CREATE TABLE IF NOT EXISTS states (
                id TEXT PRIMARY KEY,
                market_domain TEXT,
                query TEXT,
                state_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor_obj.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                session_id TEXT,
                message_type TEXT, -- user, ai
                content TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (session_id, timestamp)
            )
        ''')
        conn.commit()
        conn.close()
        logger.info(f"Database '{db_path}' initialized/verified successfully.")
    except Exception as e_db_init: # Renamed
        error_logger.error(f"Failed to initialize database '{db_name}': {e_db_init} (Path attempted: {db_path})")
        raise # Re-raise to indicate critical failure

init_db() # Call on module load

class MarketIntelligenceState(BaseModel):
    raw_news_data: List[Dict[str, Any]] = Field(default_factory=list)
    competitor_data: List[Dict[str, Any]] = Field(default_factory=list)
    market_trends: List[Dict[str, Any]] = Field(default_factory=list)
    opportunities: List[Dict[str, Any]] = Field(default_factory=list)
    strategic_recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    market_domain: str = "General Technology" # Default value
    query: Optional[str] = None
    question: Optional[str] = None
    query_response: Optional[str] = None
    report_template: Optional[str] = None
    vector_store_path: Optional[str] = None
    state_id: str = Field(default_factory=lambda: str(uuid4()))
    report_dir: Optional[str] = None # This will be an absolute path
    chart_paths: List[str] = Field(default_factory=list) # Relative paths/filenames of charts

    @field_validator('market_domain')
    @classmethod
    def validate_market_domain_value(cls, v_domain: str) -> str: # Renamed
        if not v_domain:
            raise ValueError("Market domain cannot be empty.")
        if not re.match(r'^[a-zA-Z0-9\s-]+$', v_domain):
            raise ValueError("Market domain must contain only letters, numbers, spaces, or hyphens.")
        return v_domain.strip()

    @field_validator('query')
    @classmethod
    def validate_query_value(cls, v_query: Optional[str]) -> Optional[str]: # Renamed
        if v_query and len(v_query.strip()) < 3:
            raise ValueError("Query must be at least 3 characters long if provided.")
        return v_query.strip() if v_query else None

    class Config:
        validate_assignment = True


def get_db_path():
    db_name = 'market_intelligence_agent.db'
    if os.environ.get("VERCEL_ENV"):
        return os.path.join("/tmp", db_name)
    else:
        api_python_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(api_python_dir, db_name)


def save_state(state_obj: MarketIntelligenceState): # Renamed
    db_path = get_db_path()
    try:
        conn = sqlite3.connect(db_path)
        cursor_obj = conn.cursor()
        cursor_obj.execute(
            'INSERT OR REPLACE INTO states (id, market_domain, query, state_data, created_at) VALUES (?, ?, ?, ?, ?)',
            (state_obj.state_id, state_obj.market_domain, state_obj.query, state_obj.model_dump_json(), datetime.now())
        )
        conn.commit()
        conn.close()
        logger.info(f"State saved: ID={state_obj.state_id}, Domain='{state_obj.market_domain}' to {db_path}")
    except Exception as e_save_state: # Renamed
        error_logger.error(f"Failed to save state {state_obj.state_id} to {db_path}: {e_save_state}")

def load_state(state_id_to_load: str) -> Optional[MarketIntelligenceState]: # Renamed
    db_path = get_db_path()
    try:
        conn = sqlite3.connect(db_path)
        cursor_obj = conn.cursor()
        cursor_obj.execute('SELECT state_data FROM states WHERE id = ?', (state_id_to_load,))
        result_data_row = cursor_obj.fetchone() # Renamed
        conn.close()
        if result_data_row:
            loaded_state = MarketIntelligenceState(**json.loads(result_data_row[0]))
            logger.info(f"State loaded: ID={state_id_to_load}, Domain='{loaded_state.market_domain}' from {db_path}")
            return loaded_state
        else:
            logger.warning(f"State ID '{state_id_to_load}' not found in database at {db_path}.")
            return None
    except Exception as e_load_state: # Renamed
        error_logger.error(f"Failed to load state {state_id_to_load} from {db_path}: {e_load_state}")
        return None

def save_chat_message(session_id_val: str, message_type_val: str, content_val: str): # Renamed
    db_path = get_db_path()
    try:
        conn = sqlite3.connect(db_path)
        cursor_obj = conn.cursor()
        cursor_obj.execute(
            'INSERT INTO chat_history (session_id, message_type, content, timestamp) VALUES (?, ?, ?, ?)',
            (session_id_val, message_type_val, content_val, datetime.now())
        )
        conn.commit()
        conn.close()
        logger.info(f"Chat message saved: SessionID='{session_id_val}', Type='{message_type_val}' to {db_path}")
    except Exception as e_save_chat: # Renamed
        error_logger.error(f"Failed to save chat message for SessionID '{session_id_val}' to {db_path}: {e_save_chat}")

def load_chat_history(session_id_val: str) -> List[Dict[str, Any]]: # Renamed for FastAPI compatibility
    db_path = get_db_path()
    try:
        conn = sqlite3.connect(db_path)
        cursor_obj = conn.cursor()
        cursor_obj.execute('SELECT message_type, content FROM chat_history WHERE session_id = ? ORDER BY timestamp ASC', (session_id_val,))
        messages_history_list = [{"type": row[0], "content": row[1]} for row in cursor_obj.fetchall()] # Renamed
        conn.close()
        logger.info(f"Chat history loaded: SessionID='{session_id_val}', Messages Count={len(messages_history_list)} from {db_path}")
        return messages_history_list
    except Exception as e_load_chat: # Renamed
        error_logger.error(f"Failed to load chat history for SessionID '{session_id_val}' from {db_path}: {e_load_chat}")
        return []

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8)) # Adjusted retry
def search_with_tavily(search_query: str) -> List[str]: # Renamed
    normalized_cache_key = f"tavily_search_{search_query.lower().replace(' ', '_')}" # Renamed
    if normalized_cache_key in search_results_cache:
        logger.info(f"Tavily Search: Cache hit for query: '{search_query}'")
        return search_results_cache[normalized_cache_key]

    tavily_api_key_val = os.getenv("TAVILY_API_KEY") # Renamed
    if not tavily_api_key_val:
        error_logger.critical("TAVILY_API_KEY not found in environment variables.")
        raise ValueError("TAVILY_API_KEY is not set. Please ensure it's in your .env file or environment.")

    try:
        logger.info(f"Tavily Search: Performing API search for query: '{search_query}'")
        response = requests.post(
            "https://api.tavily.com/search",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            json={
                "api_key": tavily_api_key_val, "query": search_query,
                "search_depth": "advanced", "include_answer": False, "max_results": 7 # Reduced results
            }
        )
        response.raise_for_status()
        response_data = response.json() # Renamed
        extracted_urls = [r["url"] for r in response_data.get("results", []) if r.get("url")] # Renamed
        search_results_cache[normalized_cache_key] = extracted_urls
        logger.info(f"Tavily Search: Retrieved {len(extracted_urls)} URLs for query: '{search_query}'")
        return extracted_urls
    except requests.exceptions.RequestException as e_tavily_req: # Renamed
        error_logger.error(f"Tavily Search API request failed for query '{search_query}': {e_tavily_req}")
        raise
    except Exception as e_tavily_other: # Renamed
        error_logger.error(f"Unexpected error during Tavily search for query '{search_query}': {e_tavily_other}")
        raise

def fetch_url_content(url_to_fetch: str) -> Dict[str, Any]: # Renamed
    try:
        logger.info(f"WebBaseLoader: Loading content from URL: {url_to_fetch}")
        if "USER_AGENT" not in os.environ:
             os.environ["USER_AGENT"] = "MarketIntelligenceAgent/1.0 (+http://example.com/botinfo)"

        loader = WebBaseLoader([url_to_fetch])
        loaded_docs = loader.load() # Renamed
        doc_object = loaded_docs[0] if loaded_docs else None # Renamed

        if doc_object:
            raw_page_content = doc_object.page_content # Renamed
            cleaned_page_content = re.sub(r'\n\s*\n', '\n\n', raw_page_content).strip() # Corrected re.sub
            summary_text = cleaned_page_content[:1000] # Increased summary length
            document_title = doc_object.metadata.get("title", "") or os.path.basename(url_to_fetch) # Renamed
            if not document_title: document_title = "Untitled Document"

            logger.info(f"WebBaseLoader: Loaded from {url_to_fetch}. Title: '{document_title}'. Summary (first 50): '{summary_text[:50]}...'")
            return {"source": url_to_fetch, "title": document_title, "summary": summary_text, "full_content": cleaned_page_content, "url": url_to_fetch}
        else:
            logger.warning(f"WebBaseLoader: No document object returned from {url_to_fetch}")
            return {"source": url_to_fetch, "title": "Content Not Loaded", "summary": "", "full_content": "", "url": url_to_fetch}
    except Exception as e_fetch_url: # Renamed
        error_logger.error(f"WebBaseLoader: Failed to load content from URL '{url_to_fetch}': {e_fetch_url}")
        return {"source": url_to_fetch, "title": f"Failed to Load: {os.path.basename(url_to_fetch)}", "summary": str(e_fetch_url), "full_content": "", "url": url_to_fetch}

def get_agent_base_reports_dir():
    # Get the directory where agent_logic.py is located
    agent_script_dir = os.path.dirname(os.path.abspath(__file__))
    # Default base for reports, relative to the script location (api_python/reports1)
    base_reports_dir = os.path.join(agent_script_dir, "reports1")

    if os.environ.get("VERCEL_ENV"): # Use /tmp for reports on Vercel
        base_reports_dir = os.path.join("/tmp", "reports1")
        logger.info(f"Vercel environment detected. Using /tmp/reports1 for reports base.")
    else:
        logger.info(f"Local environment. Using {base_reports_dir} for reports base.")

    os.makedirs(base_reports_dir, exist_ok=True)
    return base_reports_dir

def market_data_collector(current_state: MarketIntelligenceState) -> Dict[str, Any]: # Renamed
    logger.info(f"Market Data Collector: Domain='{current_state.market_domain}', Query='{current_state.query or 'N/A'}'")

    ts_string = datetime.now().strftime("%Y%m%d_%H%M%S") # Renamed
    query_prefix = re.sub(r'[^a-zA-Z0-9_-]', '_', (current_state.query or "general").lower().replace(' ', '_')[:20]) # Renamed

    base_reports_path = get_agent_base_reports_dir()

    run_report_dir = os.path.join(base_reports_path, f"{query_prefix}_{ts_string}") # Renamed
    try:
        os.makedirs(run_report_dir, exist_ok=True)
        current_state.report_dir = run_report_dir # This is an absolute path
        logger.info(f"Market Data Collector: Report directory set to absolute path: {run_report_dir}")
    except Exception as e_mkdir_report: # Renamed
        error_logger.critical(f"CRITICAL: Failed to create report directory '{run_report_dir}': {e_mkdir_report}")
        raise IOError(f"Cannot create report directory '{run_report_dir}': {e_mkdir_report}")

    json_file_path = os.path.join(run_report_dir, f"{current_state.market_domain.lower().replace(' ', '_')}_data_sources.json") # Renamed
    csv_file_path = os.path.join(run_report_dir, f"{current_state.market_domain.lower().replace(' ', '_')}_data_sources.csv") # Renamed

    try:
        news_search_query = f"{current_state.query} {current_state.market_domain} news trends developments emerging technologies" # More specific
        competitor_search_query = f"{current_state.query} {current_state.market_domain} competitor landscape key players market share" # More specific

        news_urls_list = search_with_tavily(news_search_query) # Renamed
        competitor_urls_list = search_with_tavily(competitor_search_query) # Renamed
    except Exception as e_search: # Renamed
        error_logger.error(f"Market Data Collector: Tavily search phase failed: {e_search}")
        current_state.raw_news_data, current_state.competitor_data = [], []
        save_state(current_state)
        return current_state.model_dump()

    combined_unique_urls = list(set(news_urls_list + competitor_urls_list)) # Renamed
    logger.info(f"Market Data Collector: Total unique URLs to process: {len(combined_unique_urls)}")

    all_fetched_data = [] # Renamed
    for idx, loop_url in enumerate(combined_unique_urls): # Renamed
        logger.info(f"Market Data Collector: Processing URL {idx + 1}/{len(combined_unique_urls)}: {loop_url}")
        content_data = fetch_url_content(loop_url) # Renamed
        all_fetched_data.append(content_data)

    current_state.raw_news_data = all_fetched_data
    current_state.competitor_data = all_fetched_data

    try:
        with open(json_file_path, "w", encoding="utf-8") as f: json.dump(all_fetched_data, f, indent=4)
        logger.info(f"Market Data Collector: Data saved to JSON: {json_file_path}")
    except Exception as e_json: error_logger.error(f"Failed to save JSON '{json_file_path}': {e_json}") # Renamed

    try:
        with open(csv_file_path, "w", newline="", encoding="utf-8") as f:
            field_names_csv = ["title", "summary", "url", "source", "full_content"] # Renamed
            writer_csv = csv.DictWriter(f, fieldnames=field_names_csv, extrasaction='ignore') # Renamed
            writer_csv.writeheader()
            writer_csv.writerows(all_fetched_data)
        logger.info(f"Market Data Collector: Data saved to CSV: {csv_file_path}")
    except Exception as e_csv: error_logger.error(f"Failed to save CSV '{csv_file_path}': {e_csv}") # Renamed

    save_state(current_state)
    logger.info("Market Data Collector: Node completed.")
    return current_state.model_dump()

def llm_json_parser_robust(llm_output_str: str, default_return_val: Any = None) -> Any: # Renamed
    logger.debug(f"LLM JSON Parser: Attempting to parse: {llm_output_str[:200]}...") # Debug level
    json_str_to_parse = ""
    try:
        # Remove markdown fences and strip whitespace
        cleaned_llm_output = re.sub(r"```json\s*([\s\S]*?)\s*```", r"", llm_output_str.strip(), flags=re.IGNORECASE)

        start_brace = cleaned_llm_output.find('{')
        start_bracket = cleaned_llm_output.find('[')

        if start_brace == -1 and start_bracket == -1:
             logger.warning(f"LLM JSON Parser: No JSON object/array start found. Output: {cleaned_llm_output[:200]}")
             return default_return_val if default_return_val is not None else []

        json_start_char = ''
        json_start_index = -1
        if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
            json_start_char = '{'
            json_start_index = start_brace
        else:
            json_start_char = '['
            json_start_index = start_bracket

        open_count = 0
        json_end_index = -1
        for i in range(json_start_index, len(cleaned_llm_output)):
            if cleaned_llm_output[i] == json_start_char:
                open_count += 1
            elif (json_start_char == '{' and cleaned_llm_output[i] == '}') or \
                 (json_start_char == '[' and cleaned_llm_output[i] == ']'):
                open_count -= 1

            if open_count == 0:
                json_end_index = i
                break

        if json_end_index == -1:
            logger.warning(f"LLM JSON Parser: Could not find matching end for '{json_start_char}'. Output: {cleaned_llm_output[:200]}")
            return default_return_val if default_return_val is not None else []

        json_str_to_parse = cleaned_llm_output[json_start_index : json_end_index + 1]
        parsed_json = json.loads(json_str_to_parse)
        logger.debug("LLM JSON Parser: Successfully parsed JSON.")
        return parsed_json
    except json.JSONDecodeError as e_json_decode:
        error_logger.warning(f"LLM JSON Parser: Parsing failed: {e_json_decode}. String attempted: '{json_str_to_parse if json_str_to_parse else cleaned_llm_output[:500]}'")
        return default_return_val if default_return_val is not None else []


def trend_analyzer(current_state: MarketIntelligenceState) -> Dict[str, Any]:
    logger.info(f"Trend Analyzer: Domain='{current_state.market_domain}'")
    default_trends_list = [{"trend_name": "Default Trend", "description": "No specific trends identified.", "supporting_evidence": "N/A", "estimated_impact": "Unknown", "timeframe": "Unknown"}]
    try:
        if not os.getenv("GOOGLE_API_KEY"):
            error_logger.critical("GOOGLE_API_KEY not found for Trend Analyzer (Gemini).")
            raise ValueError("GOOGLE_API_KEY is not set.")

        llm = init_chat_model(model_name="gemini-pro", model_provider="google_genai", temperature=0.2)

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert market analyst for {market_domain}. Identify key trends from the provided data. Return a JSON array of objects, each with 'trend_name' (string), 'description' (string), 'supporting_evidence' (string, cite sources if possible), 'estimated_impact' ('High'/'Medium'/'Low'), 'timeframe' ('Short-term'/'Medium-term'/'Long-term'). Aim for 3-5 trends."),
            ("human", "Data for {market_domain} (Query: {query}):

News/Competitor Info (sample):
{input_json_data}")
        ])
        chain = prompt | llm | StrOutputParser()

        limited_news_data = current_state.raw_news_data[:5] if current_state.raw_news_data else []
        limited_competitor_data = current_state.competitor_data[:5] if current_state.competitor_data else []
        input_data_for_llm = {"news_sample": limited_news_data, "competitors_sample": limited_competitor_data}

        logger.info(f"Trend Analyzer: Invoking LLM. News items: {len(limited_news_data)}, Competitor items: {len(limited_competitor_data)}")
        llm_output_string = chain.invoke({
            "market_domain": current_state.market_domain,
            "query": current_state.query or "general",
            "input_json_data": json.dumps(input_data_for_llm)
        })

        parsed_trends = llm_json_parser_robust(llm_output_string, default_return_val=default_trends_list)

        if not isinstance(parsed_trends, list) or not all(isinstance(t, dict) for t in parsed_trends):
            logger.warning(f"Trend Analyzer: Parsed trends not a list of dicts. Using default. Output: {llm_output_string[:200]}")
            parsed_trends = default_trends_list

        logger.info(f"Trend Analyzer: Identified {len(parsed_trends)} trends.")
        current_state.market_trends = parsed_trends

    except Exception as e_trend:
        error_logger.error(f"Trend Analyzer: Failed for '{current_state.market_domain}': {e_trend}
{traceback.format_exc()}")
        current_state.market_trends = default_trends_list

    save_state(current_state)
    logger.info("Trend Analyzer: Node completed.")
    return current_state.model_dump()

def opportunity_identifier(current_state: MarketIntelligenceState) -> Dict[str, Any]:
    logger.info(f"Opportunity Identifier: Domain='{current_state.market_domain}'")
    default_ops = [{"opportunity_name": "Default Opportunity", "description": "N/A"}]
    try:
        if not os.getenv("GOOGLE_API_KEY"):
            error_logger.critical("GOOGLE_API_KEY not found for Opportunity Identifier (Gemini).")
            raise ValueError("GOOGLE_API_KEY is not set.")
        llm = init_chat_model(model_name="gemini-pro", model_provider="google_genai", temperature=0.3)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Identify market opportunities for {market_domain} based on trends, news, and competitor data. Return JSON array: 'opportunity_name', 'description', 'target_segment', 'competitive_advantage', 'estimated_potential' (High/Medium/Low), 'timeframe_to_capture'. Min 2-3."),
            ("human", "Context for {market_domain}:
Trends: {trends_json}
News/Competitors (sample): {data_json}")
        ])
        chain = prompt | llm | StrOutputParser()
        limited_news = current_state.raw_news_data[:5] if current_state.raw_news_data else []
        llm_output = chain.invoke({
            "market_domain": current_state.market_domain,
            "trends_json": json.dumps(current_state.market_trends[:5] if current_state.market_trends else []),
            "data_json": json.dumps({"news_sample": limited_news})
        })
        parsed_ops = llm_json_parser_robust(llm_output, default_return_val=default_ops)
        current_state.opportunities = parsed_ops if isinstance(parsed_ops, list) else default_ops
    except Exception as e:
        error_logger.error(f"Opportunity Identifier failed: {e}
{traceback.format_exc()}")
        current_state.opportunities = default_ops
    save_state(current_state)
    logger.info(f"Opportunity Identifier: Found {len(current_state.opportunities)} opportunities.")
    return current_state.model_dump()

def strategy_recommender(current_state: MarketIntelligenceState) -> Dict[str, Any]:
    logger.info(f"Strategy Recommender: Domain='{current_state.market_domain}'")
    default_strats = [{"strategy_title": "Default Strategy", "description": "N/A"}]
    try:
        if not os.getenv("GOOGLE_API_KEY"):
            error_logger.critical("GOOGLE_API_KEY not found for Strategy Recommender (Gemini).")
            raise ValueError("GOOGLE_API_KEY is not set.")
        llm = init_chat_model(model_name="gemini-pro", model_provider="google_genai", temperature=0.3)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Recommend strategies for {market_domain} based on opportunities, trends, and competitor data. Return JSON array: 'strategy_title', 'description', 'implementation_steps' (list), 'expected_outcome', 'resource_requirements', 'priority_level', 'success_metrics'. Min 2-3."),
            ("human", "Context for {market_domain}:
Opportunities: {ops_json}
Trends: {trends_json}
Competitors (sample): {comp_json}")
        ])
        chain = prompt | llm | StrOutputParser()
        limited_comp = current_state.competitor_data[:5] if current_state.competitor_data else []
        llm_output = chain.invoke({
            "market_domain": current_state.market_domain,
            "ops_json": json.dumps(current_state.opportunities[:5] if current_state.opportunities else []),
            "trends_json": json.dumps(current_state.market_trends[:5] if current_state.market_trends else []),
            "comp_json": json.dumps({"competitors_sample": limited_comp})
        })
        parsed_strats = llm_json_parser_robust(llm_output, default_return_val=default_strats)
        current_state.strategic_recommendations = parsed_strats if isinstance(parsed_strats, list) else default_strats
    except Exception as e:
        error_logger.error(f"Strategy Recommender failed: {e}
{traceback.format_exc()}")
        current_state.strategic_recommendations = default_strats
    save_state(current_state)
    logger.info(f"Strategy Recommender: Generated {len(current_state.strategic_recommendations)} strategies.")
    return current_state.model_dump()

def report_template_generator(current_state: MarketIntelligenceState) -> Dict[str, Any]:
    logger.info(f"Report Template Generator: Domain='{current_state.market_domain}'")
    default_tmpl = f"# Market Intelligence Report: {current_state.market_domain}
..."
    try:
        if not os.getenv("GOOGLE_API_KEY"):
            error_logger.critical("GOOGLE_API_KEY not found for Report Template Generator (Gemini).")
            raise ValueError("GOOGLE_API_KEY is not set.")
        llm = init_chat_model(model_name="gemini-pro", model_provider="google_genai", temperature=0.1)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Create a markdown report template for {market_domain} on query '{query}'. Sections: Title, Date, Prepared By, Executive Summary, Key Trends (name, desc, impact, timeframe), Opportunities (name, desc, potential), Recommendations (title, desc, priority), Competitive Landscape, Visualizations (placeholders like ![Chart Description](filename.png)), Appendix. No ```markdown``` fences."),
            ("human", "Generate template for market: {market_domain}, query: {query}")
        ])
        chain = prompt | llm | StrOutputParser()
        generated_template = chain.invoke({
            "market_domain": current_state.market_domain,
            "query": current_state.query or "General Overview"
        })
        current_state.report_template = generated_template.replace("```markdown", "").replace("```", "").strip() or default_tmpl
    except Exception as e:
        error_logger.error(f"Report Template Generator failed: {e}
{traceback.format_exc()}")
        current_state.report_template = default_tmpl
    save_state(current_state)
    logger.info(f"Report Template Generator: Template length {len(current_state.report_template)}.")
    return current_state.model_dump()

def get_vector_store_path(current_state: MarketIntelligenceState) -> str:
    base_dir = get_agent_base_reports_dir()
    report_specific_dir = current_state.report_dir or os.path.join(base_dir, f"VS_FALLBACK_{current_state.state_id[:4]}")
    if not os.path.isabs(report_specific_dir):
        report_specific_dir = os.path.join(base_dir, report_specific_dir)

    os.makedirs(report_specific_dir, exist_ok=True)
    return os.path.join(report_specific_dir, f"vector_store_faiss_{current_state.state_id[:4]}")


def setup_vector_store(current_state: MarketIntelligenceState) -> Dict[str, Any]:
    logger.info(f"Vector Store Setup: StateID='{current_state.state_id}'")
    if not current_state.report_dir:
        current_state.report_dir = os.path.join(get_agent_base_reports_dir(), f"VS_SETUP_FALLBACK_DIR_{current_state.state_id[:4]}")
        os.makedirs(current_state.report_dir, exist_ok=True)
        logger.warning(f"report_dir was not set, using fallback for VS setup: {current_state.report_dir}")

    vs_data_json_path = os.path.join(current_state.report_dir, f"{current_state.market_domain.lower().replace(' ', '_')}_data_sources.json")
    docs_for_vs = []

    if os.path.exists(vs_data_json_path):
        try:
            with open(vs_data_json_path, "r", encoding="utf-8") as f:
                data_items = json.load(f)
                for item in data_items:
                    content = item.get('full_content') or item.get('summary', '')
                    if content:
                         docs_for_vs.append({"content": f"Title: {item.get('title', 'N/A')}
URL: {item.get('url', 'N/A')}
Content: {content}",
                                            "metadata": {"source": "web_document", "url": item.get('url'), "title": item.get('title')}})
        except Exception as e: error_logger.error(f"VS Setup: Error reading '{vs_data_json_path}': {e}")
    else:
        logger.warning(f"VS Setup: Data sources JSON file not found: {vs_data_json_path}")

    generated_content_map = {
        "Market Trends Analysis": current_state.market_trends,
        "Identified Opportunities": current_state.opportunities,
        "Strategic Recommendations": current_state.strategic_recommendations
    }
    for type_name, content_items in generated_content_map.items():
        if content_items:
            docs_for_vs.append({"content": f"{type_name} for {current_state.market_domain} (Query: {current_state.query or 'N/A'}):
{json.dumps(content_items, indent=2)}",
                               "metadata": {"source": f"agent_generated_{type_name.lower().replace(' ', '_')}"}})

    if not docs_for_vs:
        logger.warning("VS Setup: No documents to add to vector store.")
        current_state.vector_store_path = None
        save_state(current_state)
        return current_state.model_dump()

    try:
        text_splitter_vs = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150, add_start_index=True)
        texts_for_vs, metadatas_for_vs = [], []
        for doc_item_vs in docs_for_vs:
            chunks_vs = text_splitter_vs.split_text(doc_item_vs["content"])
            for chunk_text_vs in chunks_vs:
                texts_for_vs.append(chunk_text_vs)
                metadatas_for_vs.append(doc_item_vs["metadata"])

        if not texts_for_vs:
            logger.warning("VS Setup: No text chunks after splitting. VS not created.")
            current_state.vector_store_path = None
        else:
            embeddings_vs = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2", model_kwargs={'device': 'cpu'})
            faiss_index = FAISS.from_texts(texts_for_vs, embeddings_vs, metadatas=metadatas_for_vs)

            vs_save_path = get_vector_store_path(current_state)
            faiss_index.save_local(vs_save_path)
            current_state.vector_store_path = vs_save_path
            logger.info(f"VS Setup: FAISS index saved to: {vs_save_path} with {len(texts_for_vs)} chunks.")
    except Exception as e_vs_create:
        error_logger.error(f"VS Setup: Failed to create FAISS index: {e_vs_create}
{traceback.format_exc()}")
        current_state.vector_store_path = None

    save_state(current_state)
    logger.info("Vector Store Setup: Node completed.")
    return current_state.model_dump()

def rag_query(current_state: MarketIntelligenceState) -> Dict[str, Any]:
    logger.info(f"RAG Query: Question='{current_state.question or 'N/A'}'")
    if not current_state.question:
        current_state.query_response = "No question provided for RAG."
        save_state(current_state)
        return current_state.model_dump()

    vs_path_to_load = current_state.vector_store_path
    if not vs_path_to_load or not os.path.isdir(vs_path_to_load):
        current_state.query_response = f"Error: Vector store not found or path is invalid ('{vs_path_to_load}'). Cannot answer question."
        error_logger.warning(f"RAG Query: {current_state.query_response}")
        save_state(current_state)
        return current_state.model_dump()

    rag_answer = f"Error processing RAG query: '{current_state.question}'"
    try:
        embeddings_rag = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2", model_kwargs={'device': 'cpu'})
        loaded_vs = FAISS.load_local(vs_path_to_load, embeddings_rag, allow_dangerous_deserialization=True)
        vs_retriever = loaded_vs.as_retriever(search_type="similarity_score_threshold", search_kwargs={"k": 4, "score_threshold": 0.6})

        if not os.getenv("GOOGLE_API_KEY"):
            error_logger.critical("GOOGLE_API_KEY not found for RAG Query (Gemini).")
            raise ValueError("GOOGLE_API_KEY is not set.")
        llm_rag = init_chat_model(model_name="gemini-pro", model_provider="google_genai", temperature=0.0)

        rag_chain_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an AI assistant. Answer the question based ONLY on the provided context documents. If the answer isn't in the context, say 'The provided information does not contain an answer to this question.' Be concise. Cite source URLs or titles from metadata if available and relevant."),
            ("human", "Context:
{context}

Question: {question}

Answer:")
        ])
        qa_rag_chain = RetrievalQA.from_chain_type(llm=llm_rag, chain_type="stuff", retriever=vs_retriever, return_source_documents=True, chain_type_kwargs={"prompt": rag_chain_prompt})

        result_from_chain = qa_rag_chain({"query": current_state.question})
        rag_answer = result_from_chain.get("result", "No specific answer found in context.")

        cited_sources_rag = []
        for doc_rag in result_from_chain.get("source_documents", []):
            meta = doc_rag.metadata
            cite = meta.get('title') or meta.get('url') or meta.get('source', 'Unknown Source')
            cited_sources_rag.append(cite)

        if not current_state.report_dir or not os.path.isdir(current_state.report_dir):
             current_state.report_dir = os.path.join(get_agent_base_reports_dir(), f"RAG_LOG_FALLBACK_DIR_{current_state.state_id[:4]}")
             os.makedirs(current_state.report_dir, exist_ok=True)
             logger.warning(f"report_dir for RAG log was invalid, using fallback: {current_state.report_dir}")

        rag_log_file = os.path.join(current_state.report_dir, f"rag_responses_{current_state.state_id[:4]}.log")
        with open(rag_log_file, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now()}] Q: {current_state.question}
A: {rag_answer}
Sources: {'; '.join(cited_sources_rag) or 'N/A'}
---
")
        logger.info(f"RAG Query: Response logged to '{rag_log_file}'. Sources: {cited_sources_rag}")

    except Exception as e_rag:
        error_logger.error(f"RAG Query failed: {e_rag}
{traceback.format_exc()}")
        rag_answer = f"Error during RAG query: {str(e_rag)}"

    current_state.query_response = rag_answer
    save_state(current_state)
    logger.info(f"RAG Query: Node completed. Response preview: '{rag_answer[:100]}...'")
    return current_state.model_dump()

def generate_report_charts(current_state: MarketIntelligenceState, output_dir_charts: str):
    logger.info(f"Chart Generation: Attempting to generate charts in {output_dir_charts}")
    chart_data_map = {
        "market_growth_data": {"type": "line", "data": {"years": [2020, 2021, 2022, 2023], "growth_rate": [0.05, 0.07, 0.06, 0.08]}},
        "competitor_share_data": {"type": "bar", "data": {"competitors": ["A", "B", "C"], "market_share": [0.4, 0.3, 0.2]}},
        "trend_impact_data": {"type": "bar", "data": {"trends": ["AI", "Remote Work", "Sustainability"], "impact_score": [0.8, 0.6, 0.7]}}
    }
    try:
        current_state.chart_paths = generate_charts_export(chart_data_map, output_dir_charts)
        logger.info(f"Chart Generation: Charts generated: {current_state.chart_paths}")
    except Exception as e_charts_main:
        error_logger.error(f"Chart Generation: Main process failed: {e_charts_main}
{traceback.format_exc()}")
        current_state.chart_paths = []

def verify_report_file(file_path_to_check: str) -> bool:
    if not file_path_to_check or not os.path.exists(file_path_to_check):
        error_logger.error(f"Report Verification: File not found at '{file_path_to_check}'")
        return False
    if os.path.getsize(file_path_to_check) == 0:
        error_logger.warning(f"Report Verification: File is empty at '{file_path_to_check}'")
        return False
    logger.info(f"Report Verification: File '{file_path_to_check}' exists and is not empty.")
    return True

def generate_readme(current_state: MarketIntelligenceState, output_dir_readme: str, report_filename_readme: str):
    readme_content_str = f"""# Market Intelligence Report: {current_state.market_domain}

**Query:** {current_state.query or "N/A"}
**State ID:** {current_state.state_id}
**Generated At:** {datetime.now().isoformat()}

## Report Files

*   **Main Report:** [{report_filename_readme}](./{report_filename_readme})
*   **Data (JSON):** [{current_state.market_domain.lower().replace(' ', '_')}_data_sources.json](./{current_state.market_domain.lower().replace(' ', '_')}_data_sources.json)
*   **Data (CSV):** [{current_state.market_domain.lower().replace(' ', '_')}_data_sources.csv](./{current_state.market_domain.lower().replace(' ', '_')}_data_sources.csv)
*   **Vector Store:** {'Present' if current_state.vector_store_path else 'Not Generated'} (Subdirectory: `{os.path.basename(current_state.vector_store_path)}` if present)
*   **Execution Log:** [market_intelligence_run.log](./market_intelligence_run.log) (Copied run log)
*   **RAG Log:** [rag_responses_{current_state.state_id[:4]}.log](./rag_responses_{current_state.state_id[:4]}.log) (If RAG queries were made)

## Charts
"""
    for chart_file in current_state.chart_paths: # chart_paths should be relative to output_dir_readme
        readme_content_str += f"*   ![{os.path.splitext(chart_file)[0].replace('_', ' ').title()}]({chart_file})
"
    readme_content_str += "
## Notes
This report was automatically generated by the Market Intelligence Agent.
"
    readme_file_path = os.path.join(output_dir_readme, "README.md")
    try:
        with open(readme_file_path, "w", encoding="utf-8") as f:
            f.write(readme_content_str)
        logger.info(f"README generated at: {readme_file_path}")
    except Exception as e_readme:
        error_logger.error(f"Failed to generate README.md: {e_readme}")


def generate_market_intelligence_report(current_state: MarketIntelligenceState) -> Dict[str, Any]:
    logger.info(f"Report Generation: Domain='{current_state.market_domain}', StateID='{current_state.state_id}'")

    if not current_state.report_dir or not os.path.isdir(current_state.report_dir):
        error_logger.critical(f"CRITICAL: report_dir '{current_state.report_dir}' is invalid for report generation.")
        base_reports_dir = get_agent_base_reports_dir()
        ts_fb = datetime.now().strftime("%Y%m%d_%H%M%S")
        query_fb = re.sub(r'[^a-zA-Z0-9_-]', '_', (current_state.query or "report_error").lower().replace(' ', '_')[:10])
        current_state.report_dir = os.path.join(base_reports_dir, f"{query_fb}_{ts_fb}_REPORT_ERROR_DIR")
        os.makedirs(current_state.report_dir, exist_ok=True)
        error_logger.warning(f"Created emergency fallback report_dir for report generation: {current_state.report_dir}")

    current_state.market_trends = current_state.market_trends or []
    current_state.opportunities = current_state.opportunities or []
    current_state.strategic_recommendations = current_state.strategic_recommendations or []
    current_state.competitor_data = current_state.competitor_data or []
    current_state.raw_news_data = current_state.raw_news_data or []
    # current_state.chart_paths = current_state.chart_paths or [] # chart_paths initialized in generate_report_charts

    report_data_for_llm = {
        "market_domain": current_state.market_domain,
        "query": current_state.query or "General Analysis",
        "market_trends": current_state.market_trends if current_state.market_trends else [{"trend_name": "N/A", "description": "Trend data not available."}],
        "opportunities": current_state.opportunities if current_state.opportunities else [{"opportunity_name": "N/A", "description": "Opportunity data not available."}],
        "strategic_recommendations": current_state.strategic_recommendations if current_state.strategic_recommendations else [{"strategy_title": "N/A", "description": "Strategy data not available."}],
        "competitor_data_sample": current_state.competitor_data[:5] if current_state.competitor_data else [{"title": "N/A", "summary": "Competitor data not available."}],
        "news_data_sample": current_state.raw_news_data[:5] if current_state.raw_news_data else [{"title": "N/A", "summary": "News data not available."}]
    }

    output_dir_report = current_state.report_dir
    timestamp_report_gen = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report_filename_md = f"{current_state.market_domain.lower().replace(' ', '_')}_report_{current_state.state_id[:4]}.md"
    report_full_path_md = os.path.join(output_dir_report, report_filename_md)

    agent_script_dir = os.path.dirname(os.path.abspath(__file__))
    main_exec_log_path = os.path.join(agent_script_dir, "market_intelligence.log")
    log_file_copy_path = os.path.join(output_dir_report, "market_intelligence_run.log")

    final_generated_markdown = ""
    try:
        logger.info("Report Generation: Generating charts.")
        generate_report_charts(current_state, output_dir_report)
        report_data_for_llm["chart_filenames"] = current_state.chart_paths # chart_paths is now populated

        logger.info(f"Report Generation: Initializing LLM for markdown. Charts: {current_state.chart_paths}")
        if not os.getenv("GOOGLE_API_KEY"):
            error_logger.critical("GOOGLE_API_KEY not found for Report Generation (Gemini).")
            raise ValueError("GOOGLE_API_KEY is not set.")
        llm_report = init_chat_model(model_name="gemini-pro", model_provider="google_genai", temperature=0.1)

        if current_state.report_template:
            logger.info("Report Generation: Using existing template.")
            prompt = ChatPromptTemplate.from_messages([
                ("system", f"Fill the markdown template with provided data for {current_state.market_domain}. Refer to charts using their filenames (e.g., ![Chart Description](chart_filename.png)). Date: {timestamp_report_gen}. Prepared By: Market Intelligence Agent. Ensure all template sections are addressed or marked 'N/A' if data is missing. Do not use ```markdown``` fences."),
                ("human", "Template:
{template_content}

Data (JSON):
{json_report_data}

Chart Filenames (comma-separated):
{csv_chart_filenames}")
            ])
            chain = prompt | llm_report | StrOutputParser()
            final_generated_markdown = chain.invoke({
                "template_content": current_state.report_template,
                "json_report_data": json.dumps(report_data_for_llm),
                "csv_chart_filenames": ", ".join(current_state.chart_paths or [])
            })
        else:
            logger.warning("Report Generation: No template found, generating from scratch.")
            prompt = ChatPromptTemplate.from_messages([
                 ("system", f"Generate a comprehensive markdown report for {current_state.market_domain} based on the query '{current_state.query or 'general analysis'}'. Include sections: Executive Summary, Key Market Trends, Identified Opportunities, Strategic Recommendations, Competitive Landscape, and Visualizations. Refer to charts by filename (e.g., ![Chart Description](chart_filename.png)). Date: {timestamp_report_gen}. Prepared By: Market Intelligence Agent. Do not use ```markdown``` fences."),
                ("human", "Data (JSON):
{json_report_data}

Chart Filenames (comma-separated):
{csv_chart_filenames}")
            ])
            chain = prompt | llm_report | StrOutputParser()
            final_generated_markdown = chain.invoke({
                "json_report_data": json.dumps(report_data_for_llm),
                "csv_chart_filenames": ", ".join(current_state.chart_paths or [])
            })

        final_generated_markdown = final_generated_markdown.replace("```markdown", "").replace("```", "").strip()
        if not final_generated_markdown:
            logger.error("Report Generation: LLM returned empty string for report content. Using fallback.")
            chart_refs_str = "
".join([f"![{fn}]({fn})" for fn in (current_state.chart_paths or [])])
            final_generated_markdown = f"# Fallback Report: {current_state.market_domain}

LLM failed to generate content.
Charts:
{chart_refs_str}"

        with open(report_full_path_md, "w", encoding="utf-8") as f:
            f.write(final_generated_markdown)
        logger.info(f"Report Generation: Report saved to {report_full_path_md}")
        verify_report_file(report_full_path_md)

        if os.path.exists(main_exec_log_path):
            shutil.copy2(main_exec_log_path, log_file_copy_path)
        else: logger.warning(f"Main log file not found at {main_exec_log_path} for copying to report dir.")

        generate_readme(current_state, output_dir_report, report_filename_md)

    except Exception as e_report_final:
        error_logger.error(f"Report Generation: Main process failed: {e_report_final}
{traceback.format_exc()}")
        try:
            with open(report_full_path_md, "w", encoding="utf-8") as f_err:
                f_err.write(f"# REPORT GENERATION ERROR

{str(e_report_final)}

{traceback.format_exc()}")
        except Exception as e_report_write_err: error_logger.error(f"Failed to write error report: {e_report_write_err}")

    save_state(current_state)
    logger.info("Report Generation: Node completed.")
    return current_state.model_dump()

def create_market_intelligence_workflow() -> StateGraph:
    workflow_instance = StateGraph(MarketIntelligenceState)

    workflow_instance.add_node("market_data_collector", market_data_collector)
    workflow_instance.add_node("trend_analyzer", trend_analyzer)
    workflow_instance.add_node("opportunity_identifier", opportunity_identifier)
    workflow_instance.add_node("strategy_recommender", strategy_recommender)
    workflow_instance.add_node("report_template_generator", report_template_generator)
    workflow_instance.add_node("setup_vector_store", setup_vector_store)
    workflow_instance.add_node("rag_query", rag_query)
    workflow_instance.add_node("generate_final_report", generate_market_intelligence_report)

    workflow_instance.set_entry_point("market_data_collector")
    workflow_instance.add_edge("market_data_collector", "trend_analyzer")
    workflow_instance.add_edge("trend_analyzer", "opportunity_identifier")
    workflow_instance.add_edge("opportunity_identifier", "strategy_recommender")
    workflow_instance.add_edge("strategy_recommender", "report_template_generator")
    workflow_instance.add_edge("report_template_generator", "setup_vector_store")

    def should_run_rag(state: MarketIntelligenceState) -> str: # Changed to take MarketIntelligenceState
        # state_data = state if isinstance(state, dict) else state.model_dump() # Already a model if typed in StateGraph
        if state.question and state.vector_store_path:
            logger.info("Conditional Edge: Question and vector store present, proceeding to RAG query.")
            return "rag_query"
        else:
            logger.info("Conditional Edge: No question or vector store, skipping RAG query, proceeding to report generation.")
            return "generate_final_report"

    workflow_instance.add_conditional_edges(
        "setup_vector_store",
        should_run_rag,
        {
            "rag_query": "rag_query",
            "generate_final_report": "generate_final_report"
        }
    )
    workflow_instance.add_edge("rag_query", "generate_final_report")
    workflow_instance.add_edge("generate_final_report", END)

    logger.info("Market intelligence workflow compiled.")
    return workflow_instance.compile()

def run_market_intelligence_agent(query_str: str = "Market analysis", market_domain_str: str = "Technology", question_str: Optional[str] = None) -> Dict[str, Any]:
    run_start_ts = datetime.now()
    logger.info(f"Agent Run: Started at {run_start_ts.isoformat()}. Query='{query_str}', Domain='{market_domain_str}', Question='{question_str or 'N/A'}'")

    required_env_vars = ["TAVILY_API_KEY", "GOOGLE_API_KEY"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_vars:
        msg = f"Missing critical environment variables: {', '.join(missing_vars)}. Agent cannot proceed."
        error_logger.critical(msg)
        return {"success": False, "error": msg, "state_id": None, "report_dir_relative": None, "report_filename": None, "chart_filenames": [], "data_json_filename": None, "data_csv_filename": None, "readme_filename": None, "log_filename": None, "rag_log_filename": None, "vector_store_dirname": None, "query_response": None }

    agent_base_reports_dir = get_agent_base_reports_dir()
    try:
        temp_perm_test_file = os.path.join(agent_base_reports_dir, f".perm_{uuid4()}.tmp")
        with open(temp_perm_test_file, "w") as f: f.write("ok")
        os.remove(temp_perm_test_file)
    except Exception as e_base_dir_perm:
        msg = f"CRITICAL: No write permission to base reports directory '{agent_base_reports_dir}'. Error: {e_base_dir_perm}"
        error_logger.critical(msg)
        return {"success": False, "error": msg, "state_id": None, "report_dir_relative": None, "report_filename": None, "chart_filenames": [], "data_json_filename": None, "data_csv_filename": None, "readme_filename": None, "log_filename": None, "rag_log_filename": None, "vector_store_dirname": None, "query_response": None }

    compiled_agent_workflow = create_market_intelligence_workflow()
    current_run_initial_state = MarketIntelligenceState(query=query_str, market_domain=market_domain_str, question=question_str)

    try:
        logger.info(f"Agent Run: Invoking workflow. State ID: {current_run_initial_state.state_id}")
        final_run_state_dict = compiled_agent_workflow.invoke(current_run_initial_state)
        final_run_state = MarketIntelligenceState(**final_run_state_dict)
        logger.info(f"Agent Run: Workflow completed. Final State ID: {final_run_state.state_id}")

        if not final_run_state.report_dir or not os.path.isdir(final_run_state.report_dir):
            error_logger.critical(f"Agent Run: CRITICAL - report_dir is invalid ('{final_run_state.report_dir}') after workflow.")
            fallback_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            fallback_query = re.sub(r'[^a-zA-Z0-9_-]', '_', (query_str or "agent_run_error").lower().replace(' ', '_')[:10])
            final_run_state.report_dir = os.path.join(agent_base_reports_dir, f"{fallback_query}_{fallback_ts}_FINAL_RUN_ERROR_DIR")
            os.makedirs(final_run_state.report_dir, exist_ok=True)
            try:
                error_readme_content = f"# Agent Run Error..."
                with open(os.path.join(final_run_state.report_dir, "README_ERROR.md"), "w") as f_err_readme:
                    f_err_readme.write(error_readme_content)
            except: pass

        output_directory_path = final_run_state.report_dir
        report_md_file_path = os.path.join(output_directory_path, f"{final_run_state.market_domain.lower().replace(' ', '_')}_report_{final_run_state.state_id[:4]}.md")
        is_final_report_valid = verify_report_file(report_md_file_path)

        report_dir_for_client = output_directory_path
        if output_directory_path.startswith("/tmp/"):
            report_dir_for_client = os.path.relpath(output_directory_path, "/tmp")

        response_object = {
            "success": is_final_report_valid, "state_id": final_run_state.state_id,
            "query_response": final_run_state.query_response,
            "report_dir_relative": report_dir_for_client,
            "report_filename": os.path.basename(report_md_file_path) if is_final_report_valid else None,
            "chart_filenames": final_run_state.chart_paths or [], # Ensure it's a list
            "data_json_filename": f"{final_run_state.market_domain.lower().replace(' ', '_')}_data_sources.json",
            "data_csv_filename": f"{final_run_state.market_domain.lower().replace(' ', '_')}_data_sources.csv",
            "readme_filename": "README.md",
            "log_filename": "market_intelligence_run.log",
            "rag_log_filename": f"rag_responses_{final_run_state.state_id[:4]}.log",
            "vector_store_dirname": os.path.basename(final_run_state.vector_store_path) if final_run_state.vector_store_path else None,
        }
        if not is_final_report_valid:
            error_msg_report = f"Critical: Main report Markdown file not found or invalid at '{report_md_file_path}'."
            response_object["error"] = (response_object.get("error", "") + " " + error_msg_report).strip()
            error_logger.error(error_msg_report)

        logger.info(f"Agent Run: Finished. Success: {response_object['success']}. Report relative dir: {response_object['report_dir_relative']}")
        return response_object

    except Exception as e_agent_run:
        tb_str = traceback.format_exc()
        error_logger.critical(f"Agent Run: CRITICAL FAILURE during workflow execution. Query='{query_str}', Domain='{market_domain_str}'. Error: {e_agent_run}
{tb_str}")

        error_state_id = current_run_initial_state.state_id
        agent_base_reports_dir_err = get_agent_base_reports_dir()
        error_report_dir_path = os.path.join(agent_base_reports_dir_err, f"CRITICAL_ERROR_{error_state_id[:8]}_{datetime.now().strftime('%Y%m%d%H%M%S')}")
        error_report_file_path = None
        try:
            os.makedirs(error_report_dir_path, exist_ok=True)
            error_report_filename_val = f"AGENT_WORKFLOW_ERROR_{error_state_id[:4]}.md"
            error_report_file_path = os.path.join(error_report_dir_path, error_report_filename_val)
            with open(error_report_file_path, "w", encoding="utf-8") as f_crit_report:
                f_crit_report.write(f"# Agent Workflow Critical Error

Timestamp: {run_start_ts.isoformat()}
Query: {query_str}
Domain: {market_domain_str}
State ID: {error_state_id}

Error: {str(e_agent_run)}

Traceback:
```
{tb_str}
```")
        except Exception as e_emergency_dir_write:
            error_logger.critical(f"Agent Run: FAILED TO WRITE EMERGENCY ERROR REPORT to '{error_report_dir_path}': {e_emergency_dir_write}")

        error_report_dir_for_client = error_report_dir_path
        if error_report_dir_path and error_report_dir_path.startswith("/tmp/"): # Check if not None
            error_report_dir_for_client = os.path.relpath(error_report_dir_path, "/tmp")

        return {
            "success": False, "error": f"Critical agent workflow failure: {str(e_agent_run)}",
            "state_id": error_state_id,
            "report_dir_relative": error_report_dir_for_client,
            "report_filename": os.path.basename(error_report_file_path) if error_report_file_path else None,
            "chart_filenames": [], "data_json_filename": None, "data_csv_filename": None,
            "readme_filename": "README_ERROR.md" if error_report_dir_path else None,
            "log_filename": None, "rag_log_filename": None, "vector_store_dirname": None,
            "query_response": None
        }

def chat_with_agent(message: str, session_id: str, history: List[Dict[str, Any]]) -> str:
    logger.info(f"Agent Chat: Received message for session_id {session_id}: '{message}'")
    save_chat_message(session_id, "user", message)

    langchain_history = []
    for msg_data in history: # history is List[Dict[str, Any]] from load_chat_history
        if msg_data["type"] == "user":
            langchain_history.append(HumanMessage(content=msg_data["content"]))
        elif msg_data["type"] == "ai": # Assuming 'ai' type from load_chat_history
            langchain_history.append(AIMessage(content=msg_data["content"]))

    try:
        if not os.getenv("GOOGLE_API_KEY"):
            error_logger.critical("GOOGLE_API_KEY not found for Chat (Gemini).")
            raise ValueError("GOOGLE_API_KEY is not set for chat.")

        chat_llm = init_chat_model(model_name="gemini-pro", model_provider="google_genai", temperature=0.7)

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Respond to the user's query based on the provided chat history."),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])

        chain = prompt_template | chat_llm | StrOutputParser()

        response_text = chain.invoke({
            "input": message,
            "chat_history": langchain_history
        })

        save_chat_message(session_id, "ai", response_text)
        logger.info(f"Agent Chat: Response generated for session_id {session_id}.")
        return response_text
    except Exception as e:
        error_logger.error(f"Agent Chat: Error processing message for session {session_id}: {e}
{traceback.format_exc()}")
        error_response = "Sorry, I encountered an error while processing your message."
        save_chat_message(session_id, "ai", error_response)
        return error_response


if __name__ == "__main__":
    cmd_arg_parser = argparse.ArgumentParser(description="Market Intelligence Agent CLI")
    cmd_arg_parser.add_argument("--query", type=str, default="AI impact on EdTech", help="The main query or topic for market analysis.")
    cmd_arg_parser.add_argument("--market", type=str, default="EdTech", help="The target market domain for analysis.")
    cmd_arg_parser.add_argument("--question", type=str, default=None, help="Optional: A specific question for the RAG system about the generated data/report.")

    parsed_cli_args = cmd_arg_parser.parse_args()

    logger.info(f"Agent CLI: Starting with Query='{parsed_cli_args.query}', Market='{parsed_cli_args.market}', Question='{parsed_cli_args.question or 'N/A'}'")

    cli_run_output = run_market_intelligence_agent(
        query_str=parsed_cli_args.query,
        market_domain_str=parsed_cli_args.market,
        question_str=parsed_cli_args.question
    )

    print("
--- Agent CLI Run Summary ---")
    print(f"Success: {cli_run_output.get('success')}")
    print(f"State ID: {cli_run_output.get('state_id')}")
    print(f"Report Directory (relative to /tmp or api_python/reports1): {cli_run_output.get('report_dir_relative')}")
    print(f"Report Filename: {cli_run_output.get('report_filename')}")
    if cli_run_output.get("query_response"):
        print(f"RAG Query Response: {cli_run_output.get('query_response')}")
    if cli_run_output.get("error"):
        print(f"Error Message: {cli_run_output.get('error')}")

    if cli_run_output.get("success"):
        print("
To view results, check the 'reports1' directory (likely in '/tmp/reports1/' on Vercel or 'api_python/reports1/' locally), then find the subdirectory indicated by 'report_dir_relative'.")
    else:
        print("
Agent run encountered errors. Please check logs ('market_intelligence.log', 'market_intelligence_errors.log') in the Python function's log (Vercel) or 'api_python/' directory (local) for details.")
