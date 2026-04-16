# AccessAI

**AccessAI** — Helps web developers instantly identify, understand, and fix accessibility barriers by combining automated WCAG scanning with AI-powered expert recommendations.

🌐 **Live:** [https://access-ai.solutions](https://access-ai.solutions)

## Architecture

| Component | Tech Stack | Directory |
|-----------|-----------|-----------|
| **Frontend** | Next.js 15, Tailwind CSS, Supabase Auth | `frontend/` |
| **Backend** | Express.js, TypeScript, Playwright, axe-core | `backend/` |
| **Browser Extension** | React 18, Vite, Tailwind CSS, Chrome MV3 | `extension/` |
| **AI Agent** | Python, FastAPI, Google ADK, Gemini 2.0 Flash | `agent/` |
| **MCP Server** | TypeScript, MCP SDK, stdio transport | `mcp-server/` |
| **Database** | Supabase (PostgreSQL) | Managed |

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (for local development)
- Supabase account
- Google AI API key

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/AccessAI.git
   cd AccessAI
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   # Fill in your values
   ```

3. Start all services with Docker Compose:
   ```bash
   docker compose up --build
   ```

   Or run services individually:

   **Backend:**
   ```bash
   cd backend && npm install && npm run dev
   ```

   **Agent:**
   ```bash
   cd agent && pip install -r requirements.txt && uvicorn app.main:app --reload
   ```

    **Frontend:**
    ```bash
    cd frontend && npm install && npm run dev
    ```

    **Browser Extension:**
    ```bash
    cd extension && npm install && npm run build
    # Then load `dist/` in chrome://extensions (see extension/README.md for details)
    ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend | Render |
| Agent | Render |
| Browser Extension | Chrome Web Store (manual upload) |
| MCP Server | npm (`npx accessai-mcp`) |
| Database | Supabase Cloud |

## Browser Extension

AccessAI also ships as a **Chrome extension** (`extension/`) for scanning websites directly from the browser toolbar.

### Features

- **One-click scanning** — scan the current tab or enter a custom URL
- **Sign in with your AccessAI account** — leverage your existing credentials and scan history
- **Inline report view** — see accessibility issues, their WCAG references, severity levels, descriptions, and recommendations right in the popup
- **Markdown formatting** — descriptions and code suggestions render with proper **bold**, *italic*, inline `` `code` ``, and ` ```fenced code blocks``` `
- **Link to full reports** — open the website for deeper analysis, chat with the AI, and view your full scan history

### Quick Start

```bash
cd extension
npm install
npm run build
# Then: chrome://extensions → Load unpacked → select dist/
```

See [`extension/README.md`](./extension/README.md) for full setup, environment variables, and how to configure CORS on the backend.

## Project Structure

```
AccessAI/
├── frontend/          # Next.js (feature-based architecture)
├── backend/           # Express.js (modular architecture)
├── extension/         # React + Vite + Chrome MV3 (browser extension)
├── agent/             # Python FastAPI + Google ADK
├── mcp-server/        # MCP server for IDE agents (Cursor, Cline, etc.)
├── docker-compose.yml
├── .env.example
└── README.md
```
