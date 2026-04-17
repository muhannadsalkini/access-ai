# AccessAI MCP Server

**Model Context Protocol (MCP) server** for [AccessAI](https://github.com/muhannadsalkini/access-ai) — AI-powered web accessibility scanning and analysis, directly from your IDE.

[![npm version](https://img.shields.io/npm/v/accessai-mcp.svg)](https://www.npmjs.com/package/accessai-mcp)
[![npm downloads](https://img.shields.io/npm/dm/accessai-mcp.svg)](https://www.npmjs.com/package/accessai-mcp)

📦 **npm:** [https://www.npmjs.com/package/accessai-mcp](https://www.npmjs.com/package/accessai-mcp)

Works with **Cursor**, **Cline**, **Claude Code**, **Windsurf**, and any MCP-compatible developer agent.

## What it does

This MCP server lets developer agents scan websites for WCAG accessibility issues, get AI-powered fix recommendations, view scan history, and ask follow-up questions — all without leaving your editor.

## Guest Mode vs. Authenticated Mode

> **New in v1.2.0** — No API key? No problem!

| Tool | Without API key | With API key |
|------|-----------------|--------------|
| `scan_url` | ✅ Works — results **not** saved to history | ✅ Works — results saved |
| `scan_code` | ✅ Works — results **not** saved to history | ✅ Works — results saved |
| `get_scan_history` | ❌ Requires API key | ✅ Works |
| `get_scan_report` | ❌ Requires API key | ✅ Works |
| `chat_about_scan` | ❌ Requires API key | ✅ Works |

**TL;DR:**
- **No API key** → You can scan URLs and HTML code right away. Results are returned inline but not stored — perfect for a quick check or trying out the tool.
- **With API key** → Full experience: results are saved to your account, you can view history, pull detailed reports, and have an AI conversation about the findings.

Get a free API key at [access-ai.solutions](https://access-ai.solutions) → Settings → API Keys.

### Tools

| Tool | Description |
|------|-------------|
| `scan_url` | Scan a website URL for WCAG accessibility issues with AI analysis |
| `scan_code` | Scan raw HTML code directly for accessibility issues (no URL needed) |
| `get_scan_history` | View your past accessibility scan history *(API key required)* |
| `get_scan_report` | Get the full detailed report for a specific scan *(API key required)* |
| `chat_about_scan` | Ask the AI follow-up questions about scan results *(API key required)* |

### Resources

| Resource | Description |
|----------|-------------|
| `accessai://scans/latest` | Latest scan report as context |

## Prerequisites

- **Node.js 18+**
- An **AccessAI API key** is **optional** for quick scans, but **required** to save results, view history, and use AI chat.
  - Sign up at [access-ai.solutions](https://access-ai.solutions)
  - Generate a key from **Settings → API Keys** (starts with `ak_live_...`)

## Quick Setup

### Option A: Guest mode (no API key needed)

Just add the MCP server — no key required. You can start scanning URLs and HTML code immediately:

```json
{
  "mcpServers": {
    "accessai": {
      "command": "npx",
      "args": ["-y", "accessai-mcp"]
    }
  }
}
```

> Scan results will be returned directly in the chat but **not saved** to your account history.

### Option B: Authenticated mode (full experience)

#### Step 1: Generate an API Key

1. Log in to your [AccessAI dashboard](https://access-ai.solutions)
2. Go to **Settings → API Keys**
3. Click **"Generate New Key"**
4. Copy the key (it starts with `ak_live_...`) — it's only shown once!

#### Step 2: Configure your IDE

Add this to your IDE's MCP configuration:

**Cursor** (`~/.cursor/mcp.json`):
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

**Cline** (VS Code settings → Cline MCP Settings):
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

**Claude Code** (`~/.claude/claude_desktop_config.json`):
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

### Option: Build from source

```bash
git clone https://github.com/muhannadsalkini/access-ai.git
cd access-ai/mcp-server
npm install
npm run build
```

Then configure your IDE to use the built file:

```json
{
  "mcpServers": {
    "accessai": {
      "command": "node",
      "args": ["/absolute/path/to/access-ai/mcp-server/dist/index.js"],
      "env": {
        "ACCESSAI_API_KEY": "ak_live_your_key_here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ACCESSAI_API_KEY` | ❌ optional | Your AccessAI API key (starts with `ak_live_`). Required only for `get_scan_history`, `get_scan_report`, and `chat_about_scan`. `scan_url` and `scan_code` work without it (guest mode). |
| `ACCESSAI_BACKEND_URL` | ❌ optional | Custom backend URL (defaults to production). |

## Usage Examples

Once configured, you can ask your AI agent things like:

- *"Scan https://example.com for accessibility issues"*
- *"Show me my recent accessibility scans"*
- *"Get the full report for my last scan"*
- *"How do I fix the color contrast issues from the scan?"*
- *"Which accessibility issues should I prioritize fixing?"*
- *"Show me code examples for adding ARIA labels to fix the issues"*

## Using as a Library (SDK Integration)

Besides the MCP server, you can also import `accessai-mcp` as a **regular npm library** and use it with any AI SDK or your own code.

### Direct API Client

```typescript
import { createAccessAIClient } from "accessai-mcp/client";

const client = createAccessAIClient({
  apiKey: "ak_live_your_key_here",
});

// Scan a URL
const result = await client.createScan("https://example.com");
console.log(`Score: ${result.scan.accessibility_score}/100`);
console.log(`Issues: ${result.issues.length}`);

// Get scan history
const scans = await client.getScans();

// Get full report
const report = await client.getScanById(scans[0].id);

// Chat about results
const chat = await client.sendChatMessage(scans[0].id, "How do I fix the contrast issues?");
console.log(chat.response.content);
```

### Vercel AI SDK

```typescript
import { experimental_createMCPClient } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const mcpClient = await experimental_createMCPClient({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "accessai-mcp"],
    env: {
      ACCESSAI_API_KEY: "ak_live_your_key_here",
    },
  },
});

const tools = await mcpClient.tools();

const { text } = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools,
  prompt: "Scan https://example.com for accessibility issues and summarize the results",
});
```

### OpenAI Agents SDK (Python)

```python
from agents import Agent
from agents.mcp import MCPServerStdio

mcp = MCPServerStdio(
    command="npx",
    args=["-y", "accessai-mcp"],
    env={
        "ACCESSAI_API_KEY": "ak_live_your_key_here",
    },
)

agent = Agent(
    name="Accessibility Checker",
    instructions="You help developers fix web accessibility issues.",
    mcp_servers=[mcp],
)

# The agent can now use scan_url, get_scan_history, get_scan_report, chat_about_scan
```

### Google ADK (Python)

```python
from google.adk.tools.mcp_tool import MCPToolset, StdioServerParameters

tools, exit_stack = await MCPToolset.from_server(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "accessai-mcp"],
        env={
            "ACCESSAI_API_KEY": "ak_live_your_key_here",
        },
    )
)

# Use tools with your Google ADK agent
```

## API Key Security

- **API keys are hashed** — only SHA-256 hashes are stored in the database, never the raw key
- **Revocable** — delete a key anytime from the dashboard without affecting your account
- **Scoped** — API keys can only access API endpoints, not your dashboard or account settings
- **Auditable** — each key tracks when it was last used

## How it Works

```
Your IDE (Cursor/Cline/Claude Code)
        ↕ stdio (MCP protocol)
AccessAI MCP Server (runs locally)
        ↕ HTTPS (with API key)
AccessAI Backend (deployed on Render)
        ↕
AI Agent (Gemini) + Supabase (database)
```