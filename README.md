# AccessAI

**AccessAI** — Helps web developers instantly identify, understand, and fix accessibility barriers by combining automated WCAG scanning with AI-powered expert recommendations.

## Architecture

| Component | Tech Stack | Directory |
|-----------|-----------|-----------|
| **Frontend** | Next.js 15, Tailwind CSS, Supabase Auth | `frontend/` |
| **Backend** | Express.js, TypeScript, Playwright, axe-core | `backend/` |
| **AI Agent** | Python, FastAPI, Google ADK, Gemini 2.0 Flash | `agent/` |
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

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend | Render |
| Agent | Render |
| Database | Supabase Cloud |

## Project Structure

```
AccessAI/
├── frontend/          # Next.js (feature-based architecture)
├── backend/           # Express.js (modular architecture)
├── agent/             # Python FastAPI + Google ADK
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT
