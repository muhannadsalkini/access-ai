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
| **MCP Server** | TypeScript, MCP SDK, stdio transport | `mcp-server/` — [npm ↗](https://www.npmjs.com/package/accessai-mcp) |
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
| MCP Server | [npm](https://www.npmjs.com/package/accessai-mcp) (`npx accessai-mcp`) |
| Database | Supabase Cloud |

## MCP Server

AccessAI ships an **[MCP (Model Context Protocol)](https://modelcontextprotocol.io) server** (`mcp-server/`) that lets AI coding agents — running inside **Cursor**, **Cline**, **Claude Code**, **Windsurf**, or any MCP-compatible tool — scan websites and HTML code for WCAG accessibility issues, view scan history, and chat about results, all without leaving the editor.

📦 **npm:** [`accessai-mcp`](https://www.npmjs.com/package/accessai-mcp)

### Tools

| Tool | Description |
|------|-------------|
| `scan_url` | Scan a live website URL for WCAG accessibility issues with AI-powered analysis |
| `scan_code` | Scan raw HTML code directly for accessibility issues (no live URL needed) |
| `get_scan_history` | Retrieve your past accessibility scan history |
| `get_scan_report` | Get the full detailed report for a specific scan |
| `chat_about_scan` | Ask the AI follow-up questions about a scan's results |

### Resources

| Resource | Description |
|----------|-------------|
| `accessai://scans/latest` | Latest scan report, surfaced as context to the AI agent |

### Quick Setup

**Step 1 — Generate an API key**

1. Log in to your [AccessAI dashboard](https://access-ai.solutions)
2. Go to **Settings → API Keys**
3. Click **"Generate New Key"**
4. Copy the key — it starts with `ak_live_...` and is shown only once

**Step 2 — Add to your IDE**

<details>
<summary><strong>Cursor</strong> (<code>~/.cursor/mcp.json</code>)</summary>

```json
{
  "mcpServers": {
    "accessai": {
      "command": "npx",
      "args": ["-y", "accessai-mcp"],
      "env": {
        "ACCESSAI_API_KEY": "ak_live_your_key_here"
      }
    }
  }
}
```
</details>

<details>
<summary><strong>Cline</strong> (VS Code → Cline MCP Settings)</summary>

```json
{
  "mcpServers": {
    "accessai": {
      "command": "npx",
      "args": ["-y", "accessai-mcp"],
      "env": {
        "ACCESSAI_API_KEY": "ak_live_your_key_here"
      }
    }
  }
}
```
</details>

<details>
<summary><strong>Claude Code</strong> (<code>~/.claude/claude_desktop_config.json</code>)</summary>

```json
{
  "mcpServers": {
    "accessai": {
      "command": "npx",
      "args": ["-y", "accessai-mcp"],
      "env": {
        "ACCESSAI_API_KEY": "ak_live_your_key_here"
      }
    }
  }
}
```
</details>

Once connected, ask your agent things like:

> *"Scan https://example.com for accessibility issues"*  
> *"Scan this HTML component for WCAG problems"*  
> *"Which accessibility issues should I fix first?"*  
> *"Show me code examples for adding ARIA labels"*

### SDK Integration

`accessai-mcp` also works as a regular npm library with any AI SDK:

<details>
<summary><strong>Direct API Client (TypeScript)</strong></summary>

```typescript
import { createAccessAIClient } from "accessai-mcp/client";

const client = createAccessAIClient({ apiKey: "ak_live_your_key_here" });

const result = await client.createScan("https://example.com");
console.log(`Score: ${result.scan.accessibility_score}/100`);

const history = await client.getScans();
const chat = await client.sendChatMessage(history[0].id, "How do I fix the contrast issues?");
```
</details>

<details>
<summary><strong>Vercel AI SDK</strong></summary>

```typescript
import { experimental_createMCPClient } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const mcpClient = await experimental_createMCPClient({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "accessai-mcp"],
    env: { ACCESSAI_API_KEY: "ak_live_your_key_here" },
  },
});

const { text } = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools: await mcpClient.tools(),
  prompt: "Scan https://example.com for accessibility issues and summarize the results",
});
```
</details>

<details>
<summary><strong>OpenAI Agents SDK (Python)</strong></summary>

```python
from agents import Agent
from agents.mcp import MCPServerStdio

mcp = MCPServerStdio(
    command="npx",
    args=["-y", "accessai-mcp"],
    env={"ACCESSAI_API_KEY": "ak_live_your_key_here"},
)

agent = Agent(
    name="Accessibility Checker",
    instructions="You help developers fix web accessibility issues.",
    mcp_servers=[mcp],
)
```
</details>

<details>
<summary><strong>Google ADK (Python)</strong></summary>

```python
from google.adk.tools.mcp_tool import MCPToolset, StdioServerParameters

tools, exit_stack = await MCPToolset.from_server(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "accessai-mcp"],
        env={"ACCESSAI_API_KEY": "ak_live_your_key_here"},
    )
)
```
</details>

### How it Works

```
Your IDE (Cursor / Cline / Claude Code / Windsurf)
          ↕ stdio  (MCP protocol)
  AccessAI MCP Server  (runs locally via npx)
          ↕ HTTPS  (authenticated with API key)
  AccessAI Backend  (Render)
          ↕
  AI Agent (Gemini 2.0 Flash) + Supabase (PostgreSQL)
```

See [`mcp-server/README.md`](./mcp-server/README.md) for full documentation and build-from-source instructions.

---

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
