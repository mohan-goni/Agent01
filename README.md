# Market Intelligence Platform

## Overview

The Market Intelligence Platform is an AI-powered dashboard designed to provide users with aggregated news, market insights, competitor analysis, and customer sentiment analysis. It leverages a RAG (Retrieval Augmented Generation) agent for interactive querying and integrates various data sources to offer a comprehensive view of the market landscape. The platform consists of a Next.js frontend and a Python FastAPI backend for agent processing.

## Tech Stack

*   **Frontend Framework:** Next.js (App Router)
*   **Backend API (Agent):** Python with FastAPI
*   **Language:** TypeScript (Frontend), Python (Backend)
*   **ORM:** Drizzle ORM (for Next.js backend interactions with PostgreSQL)
*   **Database:** PostgreSQL (for main application data), SQLite (for Python agent's internal state/cache)
*   **Authentication:** Better Auth (with Google OAuth and Email/Password)
*   **UI Components:** ShadCN UI
*   **Styling:** TailwindCSS
*   **Python Agent Core:** Langchain, Langgraph, FAISS, Sentence Transformers
*   **Deployment:** Vercel (for both Next.js and Python FastAPI service)

## Prerequisites

Before you begin, ensure you have the following installed:

*   Node.js (v18 or later recommended)
*   pnpm (Package manager - `npm install -g pnpm`)
*   Python (v3.9 or later recommended)
*   A running PostgreSQL instance (local or remote)

## Getting Started

This project includes a Next.js frontend and a Python FastAPI backend service located in the `api_python/` directory.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-name>
```

### 2. Frontend (Next.js) Setup

*   **Install Dependencies:**
    ```bash
    pnpm install
    ```
*   **Set Up Frontend Environment Variables:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env.local
        ```
    *   Open `.env.local` and fill in the required values:
        *   `DATABASE_URL`: Your PostgreSQL connection string for the main application data.
            *   Example: `postgresql://user:password@localhost:5432/market_intel_db?sslmode=disable`
        *   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: For Google OAuth.
        *   `AUTH_SECRET`: A randomly generated string for session encryption (e.g., `openssl rand -hex 32`).
        *   `AUTH_URL`: The base URL of your Next.js application (e.g., `http://localhost:3000`).
        *   `PYTHON_AGENT_API_BASE_URL` (Optional): Base URL for the Python agent API.
            *   For local development if running Python separately on port 8008: `http://localhost:8008`
            *   If using `vercel dev` or for Vercel deployment, this can often be left blank or set to `/api/python_agent` as routing is handled by `vercel.json`. The application defaults to `/api/python_agent` if this is not set, but will use `http://localhost:8008` in local dev if it's also not set (see `app/(authenticated)/agent-chat/actions.ts` and `run-analysis/actions.ts`).

*   **Database Setup & Migrations (PostgreSQL):**
    *   Ensure your PostgreSQL server is running and accessible via the `DATABASE_URL`.
    *   Create the database if it doesn't exist (e.g., `market_intel_db`).
    *   Apply Drizzle migrations for the Next.js application's database:
        ```bash
        pnpm drizzle-kit migrate
        ```
    *   If you modify `db/schema.ts`, generate new migrations: `pnpm drizzle-kit generate` then `pnpm drizzle-kit migrate`.

### 3. Backend (Python FastAPI Agent) Setup (`api_python/`)

*   **Navigate to Python API Directory:**
    ```bash
    cd api_python
    ```
*   **Create a Python Virtual Environment (Recommended):**
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```
*   **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
*   **Set Up Backend Environment Variables:**
    *   The Python agent service uses its own `.env` file within the `api_python/` directory. Copy the example:
        ```bash
        cp .env.example .env # Or create .env directly in api_python/
        ```
        *(Note: An `api_python/.env.example` is planned to be created in this step. If it doesn't exist yet, create `api_python/.env` manually based on the root `.env.example`'s comments for `TAVILY_API_KEY` and `GOOGLE_API_KEY`.)*
    *   Edit `api_python/.env` and provide:
        *   `TAVILY_API_KEY`: Your API key for Tavily search.
        *   `GOOGLE_API_KEY`: Your Google API key (e.g., for Gemini models used by the agent).
        *   *(Optional) `OPENAI_API_KEY` if you switch or add OpenAI models in `agent_logic.py`.*
*   The Python agent initializes its own SQLite database (`market_intelligence_agent.db` in `/tmp` on Vercel, or locally in `api_python/`) automatically when it starts.

### 4. (Optional) Seeding Initial Data

The Next.js application includes a "Load Sample Data" button on the dashboard. This uses a Server Action to populate the PostgreSQL database with sample articles.

## Running the Application

You have two main ways to run the full application (Next.js frontend + Python FastAPI backend) locally:

*   **Recommended for Vercel-like experience: `vercel dev`**
    *   Ensure Vercel CLI is installed (`npm install -g vercel`).
    *   Run from the project root:
        ```bash
        vercel dev
        ```
    *   This will start both the Next.js frontend (usually on port 3000) and the Python FastAPI backend (routing handled by `vercel.json` rules, typically making the Python API accessible via `/api/python_agent/...` from the Next.js port).
    *   Environment variables from `.env.local` (for Next.js) and `api_python/.env` (for Python, if `python-dotenv` loads it and Vercel dev picks it up for the Python runtime) should be used. You might need to set Python-specific env vars also in Vercel project settings for `vercel dev` to see them reliably for the Python runtime.

*   **Running Services Separately:**
    1.  **Start the Python FastAPI Agent Service:**
        ```bash
        cd api_python
        # Ensure your virtual environment is active if you created one
        # source .venv/bin/activate
        python main.py
        # Or using uvicorn for auto-reload: uvicorn main:app --reload --port 8008
        ```
        This will typically start the Python API on `http://localhost:8008`.
    2.  **Start the Next.js Frontend Service (in another terminal):**
        From the project root:
        ```bash
        pnpm dev
        ```
        This starts the Next.js app on `http://localhost:3000`.
        *Ensure your frontend's `PYTHON_AGENT_API_BASE_URL` in `.env.local` is set correctly (e.g., `http://localhost:8008`) if running separately.*

Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

### Production Mode (Next.js only)

To build the Next.js application for production:
```bash
pnpm build
```
To run the Next.js production build:
```bash
pnpm start
```
*(Note: The Python FastAPI service is deployed as serverless functions on Vercel alongside the Next.js app, as defined in `vercel.json`.)*

## Python Agent API Service (`api_python/`)

*   **Overview:** This directory contains a FastAPI application that serves the core Python-based RAG agent logic. It handles chat interactions and full market analysis report generation.
*   **Key Files:**
    *   `main.py`: The FastAPI application definition, exposing endpoints like `/chat` and `/run-analysis`.
    *   `agent_logic.py`: Contains the actual RAG agent implementation (Langchain, Langgraph, tools, LLM interactions, data processing nodes). User should replace the initial placeholder with their full `Agent.py` code.
    *   `requirements.txt`: Lists all Python dependencies for this service.
    *   `.env` (local, gitignored): Stores API keys (`TAVILY_API_KEY`, `GOOGLE_API_KEY`) needed by `agent_logic.py`. An example can be found in `api_python/.env.example`.
    *   `market_intelligence_agent.db`: SQLite database used by the agent for its internal state, chat history, etc. (Stored in `/tmp` on Vercel).
    *   `reports1/`: Directory where generated reports and data artifacts are saved (Stored in `/tmp/reports1` on Vercel).
*   **Local Development:**
    *   Navigate to `cd api_python`.
    *   Activate virtual environment (e.g., `source .venv/bin/activate`).
    *   Install dependencies: `pip install -r requirements.txt`.
    *   Ensure `api_python/.env` is configured with necessary API keys.
    *   Run: `python main.py` or `uvicorn main:app --reload --port 8008`.
*   **Interaction with Next.js:**
    *   The Next.js application (specifically Server Actions in `app/(authenticated)/agent-chat/actions.ts` and `app/(authenticated)/run-analysis/actions.ts`) makes HTTP POST requests to this Python service.
    *   In Vercel deployment, routing is managed by `vercel.json` (e.g., requests from Next.js to `/api/python_agent/*` are rewritten to the Python function).
    *   For local development when running services separately, Next.js actions use `PYTHON_AGENT_API_BASE_URL` (e.g., `http://localhost:8008`) to connect to the Python API.

## Key Features Implemented
(As in previous README, no changes here)
*   **Authentication:** ...
*   **Dashboard:** ...
*   **Data Integration:** ...
*   **RAG Agent Chat & Full Analysis:** Interactive chat with the agent and a separate interface to trigger the full market analysis report generation workflow, both interacting with the Python FastAPI backend.
*   **Dark Theme by Default:** ...
*   **Responsive Design:** ...

## Folder Structure
(Update to include `api_python/`)
*   `app/`: Next.js App Router (frontend).
*   `api_python/`: Python FastAPI service (backend agent logic).
*   `components/`: Shared React UI components.
*   `db/`: Drizzle ORM schema and migrations for PostgreSQL (frontend's DB).
*   `lib/`: Frontend TypeScript utilities and services.
*   `public/`: Static assets for Next.js.

## Linting and Formatting
(As in previous README)

---
This README provides a starting point...
