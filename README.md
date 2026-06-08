# AccessAI

**AccessAI** — Helps web developers instantly identify, understand, and fix accessibility barriers by combining automated WCAG scanning with AI-powered expert recommendations.

🌐 **Live:** [https://access-ai.solutions](https://access-ai.solutions)  
📦 **MCP Server (npm):** [`accessai-mcp`](https://www.npmjs.com/package/accessai-mcp) [![npm version](https://img.shields.io/npm/v/accessai-mcp.svg)](https://www.npmjs.com/package/accessai-mcp) [![npm downloads](https://img.shields.io/npm/dm/accessai-mcp.svg)](https://www.npmjs.com/package/accessai-mcp)  
🧩 **Browser Extension:** [Chrome Web Store](https://chromewebstore.google.com/detail/accessai/ckbcbmdcpackkggjhnbiicjkaipmkhoi)  
💻 **GitHub:** [muhannadsalkini/access-ai](https://github.com/muhannadsalkini/access-ai)

---

## Features

- **WCAG Accessibility Scanning** — scan any live URL or raw HTML code for WCAG 2.1 issues using axe-core
- **Sitemap support** — provide a sitemap URL to scan multiple pages at once
- **AI-powered analysis** — Gemini 2.0 Flash classifies severity, explains each issue, and suggests fixes
- **AI Chat** — ask follow-up questions about any scan result directly in the dashboard
- **Scan History** — all scans are saved to your account with scores and full reports
- **Compare Scans** — measure accessibility improvement between two scans (score delta, fixed issues, regressions)
- **Auto-fix Code** — submit HTML and get back a fixed version with all issues resolved in one step
- **API Keys** — generate API keys to use AccessAI programmatically or from your IDE
- **MCP Server** — IDE-native accessibility scanning for Cursor, Cline, Claude Code, Windsurf, and any MCP-compatible agent
- **Browser Extension** — one-click scanning from the Chrome toolbar with inline results
- **Guest Mode** — scan URLs and HTML code without an account (results returned inline, not saved)

---

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
   git clone https://github.com/muhannadsalkini/access-ai.git
   cd access-ai
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

| Service | Platform | Link |
|---------|----------|------|
| Frontend | Vercel | [access-ai.solutions](https://access-ai.solutions) |
| Backend | Render | — |
| Agent | Render | — |
| Browser Extension | Chrome Web Store | [Install ↗](https://chromewebstore.google.com/detail/accessai/ckbcbmdcpackkggjhnbiicjkaipmkhoi) |
| MCP Server | npm | [`accessai-mcp`](https://www.npmjs.com/package/accessai-mcp) (`npx accessai-mcp`) |
| Database | Supabase Cloud | — |

## MCP Server

AccessAI ships an **[MCP (Model Context Protocol)](https://modelcontextprotocol.io) server** (`mcp-server/`) that lets AI coding agents — running inside **Cursor**, **Cline**, **Claude Code**, **Windsurf**, or any MCP-compatible tool — scan websites and HTML code for WCAG accessibility issues, view scan history, chat about results, auto-fix code, and compare scans — all without leaving the editor.

📦 **npm:** [`accessai-mcp`](https://www.npmjs.com/package/accessai-mcp)

### Guest Mode vs. Authenticated Mode

> **No API key? No problem!** You can start scanning immediately.

| Tool | Without API key | With API key |
|------|-----------------|--------------|
| `scan_url` | ✅ Works — results **not** saved | ✅ Works — results saved |
| `scan_code` | ✅ Works — results **not** saved | ✅ Works — results saved |
| `fix_code` | ✅ Works — results **not** saved | ✅ Works — results saved |
| `get_scan_history` | ❌ Requires API key | ✅ Works |
| `get_scan_report` | ❌ Requires API key | ✅ Works |
| `chat_about_scan` | ❌ Requires API key | ✅ Works |
| `compare_scans` | ❌ Requires API key | ✅ Works |
| `delete_scan` | ❌ Requires API key | ✅ Works |

**TL;DR:** No API key → scan URLs and HTML code right away. With API key → full experience including history, reports, AI chat, auto-fix, compare, and delete.

Get a free API key at [access-ai.solutions](https://access-ai.solutions) → **Settings → API Keys**.

### Tools

| Tool | Description |
|------|-------------|
| `scan_url` | Scan a live website URL for WCAG accessibility issues with AI-powered analysis |
| `scan_code` | Scan raw HTML code directly for accessibility issues (no live URL needed) |
| `fix_code` | Scan HTML code and return the **fixed version** with all issues resolved in one step |
| `get_scan_history` | Retrieve your past accessibility scan history |
| `get_scan_report` | Get the full detailed report for a specific scan |
| `chat_about_scan` | Ask the AI follow-up questions about a scan's results |
| `compare_scans` | Compare two scans to measure accessibility improvement or detect regressions |
| `delete_scan` | Delete a scan and all its data from history (irreversible) |

### Resources

| Resource | Description |
|----------|-------------|
| `accessai://scans/latest` | Latest scan report, surfaced as context to the AI agent |

### Quick Setup

**Step 1 — Generate an API key** *(optional for quick scans)*

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

<details>
<summary><strong>Windsurf</strong> (<code>~/.codeium/windsurf/mcp_config.json</code>)</summary>

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

> **Guest mode (no API key):** Simply omit the `env` block entirely and you can start scanning right away.

Once connected, ask your agent things like:

> *"Scan https://example.com for accessibility issues"*  
> *"Scan this HTML component for WCAG problems"*  
> *"Fix all accessibility issues in this component"*  
> *"Which accessibility issues should I fix first?"*  
> *"Compare my scan from last week to today's"*  
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

### API Key Security

- **Keys are hashed** — only SHA-256 hashes are stored in the database, never the raw key
- **Revocable** — delete a key at any time from the dashboard without affecting your account
- **Scoped** — API keys can only access API endpoints, not your dashboard or account settings
- **Auditable** — each key tracks when it was last used

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

🧩 **[Install from Chrome Web Store](https://chromewebstore.google.com/detail/accessai/ckbcbmdcpackkggjhnbiicjkaipmkhoi)**

### Features

- **One-click scanning** — scan the current tab or enter a custom URL
- **Sign in with your AccessAI account** — leverage your existing credentials and scan history
- **Inline report view** — see accessibility issues, their WCAG references, severity levels, descriptions, and recommendations right in the popup
- **Markdown formatting** — descriptions and code suggestions render with proper **bold**, *italic*, inline `` `code` ``, and ` ```fenced code blocks``` `
- **Link to full reports** — open the website for deeper analysis, chat with the AI, and view your full scan history

### Quick Start

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/accessai/ckbcbmdcpackkggjhnbiicjkaipmkhoi), or build from source:

```bash
cd extension
npm install
npm run build
# Then: chrome://extensions → Load unpacked → select dist/
```

See [`extension/README.md`](./extension/README.md) for full setup, environment variables, and how to configure CORS on the backend.

---

## Project Structure

```
AccessAI/
├── frontend/          # Next.js (feature-based architecture)
├── backend/           # Express.js (modular architecture)
├── extension/         # React + Vite + Chrome MV3 (browser extension)
├── agent/             # Python FastAPI + Google ADK
├── mcp-server/        # MCP server for IDE agents (Cursor, Cline, etc.)
├── supabase/          # Database migrations
├── docker-compose.yml
├── .env.example
├── SECURITY.md
└── README.md
```

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability disclosure policy and security practices.
