# Market Intelligence Platform

## Overview

The Market Intelligence Platform is an AI-powered dashboard designed to provide users with aggregated news, market insights, competitor analysis, and customer sentiment analysis. It leverages a RAG (Retrieval Augmented Generation) agent for interactive querying and integrates various data sources to offer a comprehensive view of the market landscape.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **ORM:** Drizzle ORM
*   **Database:** PostgreSQL
*   **Authentication:** Better Auth (with Google OAuth and Email/Password)
*   **UI Components:** ShadCN UI
*   **Styling:** TailwindCSS
*   **Deployment:** Vercel (initially, as per v0.dev template)

## Prerequisites

Before you begin, ensure you have the following installed:

*   Node.js (v18 or later recommended)
*   pnpm (Package manager - `npm install -g pnpm`)
*   A running PostgreSQL instance (local or remote)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-name>
```

### 2. Install Dependencies

Install project dependencies using pnpm:

```bash
pnpm install
```

### 3. Set Up Environment Variables

*   Copy the example environment file:
    ```bash
    cp .env.example .env.local
    ```
*   Open `.env.local` in a text editor and fill in the required values:
    *   `DATABASE_URL`: Your PostgreSQL connection string.
        *   Example: `postgresql://user:password@localhost:5432/market_intel_db?sslmode=disable` (for local development)
    *   `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID from Google Cloud Console.
    *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
    *   `GOOGLE_REDIRECT_URI`: Your Google OAuth redirect URI (e.g., `http://localhost:3000/api/auth/callback/google`).
    *   `AUTH_SECRET`: A randomly generated string for session encryption. You can generate one using:
        ```bash
        openssl rand -hex 32
        ```
    *   `AUTH_URL`: The base URL of your application (e.g., `http://localhost:3000`).

### 4. Database Setup & Migrations

*   Ensure your PostgreSQL server is running and accessible via the `DATABASE_URL` you configured.
*   Create the database if it doesn't exist (e.g., `market_intel_db`).
*   Apply database migrations using Drizzle Kit to set up the schema:
    ```bash
    pnpm drizzle-kit migrate
    ```
*   **Making Schema Changes:** If you modify the database schema in `db/schema.ts`:
    1.  Generate a new migration file:
        ```bash
        pnpm drizzle-kit generate
        ```
    2.  Then, apply the new migration:
        ```bash
        pnpm drizzle-kit migrate
        ```

### 5. (Optional) Seeding Initial Data

The application includes a "Load Sample Data" button on the dashboard. This uses a Server Action to populate the database with sample articles and insights. This is the recommended way to get initial data for exploration.

## Running the Application

### Development Mode

To run the application in development mode (with hot-reloading):

```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Mode

To build the application for production:

```bash
pnpm build
```

To run the production build:

```bash
pnpm start
```

## Key Features Implemented

*   **Authentication:** Secure user sign-up, sign-in (Email/Password & Google OAuth), and forgot password flows using `better-auth`. Protected routes for authenticated users.
*   **Dashboard:** Displays aggregated news, market insights (placeholder), and KPI cards. Features data refresh and sample data seeding capabilities using Server Actions.
*   **Data Integration:**
    *   **API Keys Management:** Securely add, view (masked), delete, and simulate verification of API keys for external services.
    *   **Data Sources Management:** Add, edit, delete, enable/disable, and simulate testing of various data sources (e.g., API, Web Scraper).
*   **RAG Agent Chat:** An interactive chat interface (currently with placeholder responses) for users to query the platform's knowledge base.
*   **Dark Theme by Default:** The application uses a dark theme consistently, with a persistently dark sidebar.
*   **Responsive Design:** Core layout and components are designed to be responsive.

## Folder Structure

A brief overview of the main directories:

*   `app/`: Contains Next.js App Router pages, layouts, and route handlers.
    *   `app/api/`: API routes (primarily for authentication callbacks with `better-auth`).
    *   `app/(authenticated)/`: Route group for pages requiring authentication, using a shared layout with a sidebar.
    *   `app/auth/`: Pages related to authentication (login, signup, forgot password).
*   `components/`: Shared UI components, particularly ShadCN UI elements.
    *   `components/ui/`: Auto-generated ShadCN UI components.
    *   `components/auth/`: Authentication-specific form components.
*   `db/`: Database related files.
    *   `db/schema.ts`: Drizzle ORM schema definitions.
    *   `db/migrations/`: Drizzle Kit migration files.
*   `lib/`: Core library functions and utilities.
    *   `lib/auth.ts`: Configuration for `better-auth`.
    *   `lib/db.ts`: Drizzle ORM client setup and database query functions.
    *   `lib/news-service.ts`, `lib/ai-service.ts`: Placeholder services.
*   `public/`: Static assets.
*   `scripts/`: Utility scripts (if any, e.g., for database operations).

## Linting and Formatting

This project is set up with ESLint and Prettier (via Next.js defaults). To lint your code:

```bash
pnpm lint
```

Formatting is typically handled by editor integrations or can be run via `pnpm prettier --write .` (if Prettier is explicitly configured in `package.json` scripts).

---

This README provides a starting point. Feel free to expand it with more details about specific features, deployment instructions for other platforms, or contribution guidelines.
