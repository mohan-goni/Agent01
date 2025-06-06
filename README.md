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
    *   Open `.env.local` and fill in the required values as described in `.env.example`. This includes `DATABASE_URL` for PostgreSQL, Google OAuth credentials, `AUTH_SECRET`, `AUTH_URL`, and optionally `PYTHON_AGENT_API_BASE_URL` for specific local development setups.

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
        cp .env.example .env
        ```
        *(This refers to `api_python/.env.example`)*
    *   Edit `api_python/.env` and provide API keys like `TAVILY_API_KEY`, `GOOGLE_API_KEY`, as detailed in `api_python/.env.example`.
*   The Python agent initializes its own SQLite database (e.g., `market_intelligence_agent.db`) and stores reports. On Vercel, these are written to the `/tmp` directory (see "Deployment Considerations").

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
    *   This command starts both services according to `vercel.json` and uses environment variables set up in your Vercel project settings (link your local project to Vercel: `vercel link`) or local `.env` files (Vercel CLI might pick up `.env.local` for Next.js and `api_python/.env` for Python if `python-dotenv` is used early in Python scripts).

*   **Running Services Separately:**
    1.  **Start the Python FastAPI Agent Service:**
        ```bash
        cd api_python
        # Ensure virtual environment is active: source .venv/bin/activate
        python main.py
        # Or: uvicorn main:app --reload --port 8008
        ```
        This typically starts the Python API on `http://localhost:8008`.
    2.  **Start the Next.js Frontend Service (in another terminal):**
        From the project root:
        ```bash
        pnpm dev
        ```
        This starts the Next.js app on `http://localhost:3000`.
        *Ensure your frontend's `PYTHON_AGENT_API_BASE_URL` in `.env.local` is set to `http://localhost:8008` if running services separately this way.*

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Mode (Next.js only)

To build the Next.js application for production:
```bash
pnpm build
```
To run the Next.js production build:
```bash
pnpm start
```
*(The Python FastAPI service is deployed as serverless functions on Vercel alongside Next.js, as per `vercel.json`.)*

## Python Agent API Service (`api_python/`)

*   **Overview:** This directory contains a FastAPI application that serves the core Python-based RAG agent logic. It handles chat interactions (`/chat` endpoint) and full market analysis report generation (`/run-analysis` endpoint).
*   **Key Files:**
    *   `main.py`: FastAPI app definition.
    *   `agent_logic.py`: The core RAG agent implementation.
    *   `requirements.txt`: Python dependencies.
    *   `.env.example`: Example environment variables needed by the agent. Copy to `.env` for local setup.
    *   `market_intelligence_agent.db`: SQLite DB for agent state, chat history (in `/tmp` on Vercel).
    *   `reports1/`: Default output directory for generated reports (in `/tmp/reports1` on Vercel).
*   **Interaction with Next.js:** Next.js Server Actions call these FastAPI endpoints. `vercel.json` handles routing in deployment. `PYTHON_AGENT_API_BASE_URL` in Next.js `.env.local` can target this service directly during separate local development.

## Key Features Implemented

*   **Authentication:** Secure user sign-up, sign-in (Email/Password & Google OAuth), and forgot password flows. Protected routes.
*   **Dashboard:** Displays aggregated data, KPI cards, and placeholders for charts. Features data refresh and sample data seeding via Server Actions.
*   **Data Integration:** Management of API Keys and Data Sources with CRUD operations.
*   **RAG Agent & Full Analysis:**
    *   **Chat Interface:** Interactive chat with the RAG agent (`/agent-chat` page) via the `/api/python_agent/chat` endpoint.
    *   **Full Analysis Workflow:** A dedicated page (`/run-analysis`) to trigger the comprehensive market analysis and report generation workflow via the `/api/python_agent/run-analysis` endpoint.
*   **Artifact Access and Downloads:**
    *   Results from the "Run Analysis" feature (RAG responses, file information) are displayed on the `/run-analysis` page.
    *   Generated charts are displayed as images.
    *   Download links are provided for reports (Markdown), data files (JSON, CSV), and logs.
    *   This is facilitated by a secure Next.js API route (`/api/download-artifact?filePath=<path>`) that serves files generated by the Python agent. The `filePath` is relative to the agent's output directory (e.g., `/tmp/reports1/...` on Vercel).
*   **Dark Theme by Default:** Consistent dark theme throughout the application.
*   **Responsive Design:** Core layout and components are designed for responsiveness.

## Folder Structure

*   `app/`: Next.js App Router (frontend).
    *   `app/api/`: Next.js API routes (auth callbacks, file downloads).
    *   `app/(authenticated)/`: Protected routes using the main application layout.
*   `api_python/`: Python FastAPI service (backend RAG agent logic).
*   `components/`: Shared React UI components.
*   `db/`: Drizzle ORM schema and migrations for PostgreSQL.
*   `lib/`: Frontend TypeScript utilities, Next.js backend DB functions.
*   `public/`: Static assets for Next.js.

## Linting and Formatting

This project is set up with ESLint and Prettier. To lint your code:
```bash
pnpm lint
```

## Deployment Considerations

*   **Vercel File System:** The Python agent service, when deployed on Vercel, uses the `/tmp` directory for its SQLite database, logs, and generated reports (e.g., in `/tmp/reports1/`). This directory is ephemeral (temporary).
*   **Artifact Persistence:** Files written to `/tmp` are not guaranteed to persist long-term or across all serverless function invocations. For persistent storage of generated reports or critical agent data, future enhancements should consider integrating a cloud storage solution (e.g., Vercel Blob, AWS S3, Google Cloud Storage). The current download mechanism serves files directly from this temporary serverless storage.
*   **Environment Variables:** Ensure all required environment variables for both Next.js (in Vercel project settings, general tab) and the Python service (in Vercel project settings, Python function tab, or general if prefixed) are correctly set. This includes database URLs, auth secrets, and API keys for services like Tavily and Google Gemini.

---
This README provides a starting point. Feel free to expand it with more details.
