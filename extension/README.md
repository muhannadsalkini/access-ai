# AccessAI Browser Extension

A Chrome extension (Manifest V3) that lets authenticated AccessAI users scan any website for WCAG 2.1 accessibility issues directly from the browser toolbar.

## Features

- **Sign in** with your AccessAI account (email + password)
- **Scan current tab** with one click — auto-detects the active tab URL
- **Scan any URL** by typing or pasting it into the input
- **View inline report** — score, issue count by severity, collapsible issue cards with descriptions and recommendations
- **Open full report** on the AccessAI website for AI chat, scan history, and more

## Getting Started

### 1. Install dependencies

```bash
cd extension
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your project values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_FRONTEND_URL=https://access-ai-frontend-sepia.vercel.app
```

### 3. Build the extension

```bash
# Watch mode (development)
npm run dev

# Production build
npm run build
```

### 4. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist` folder

### 5. Add icons

Place PNG icons in `extension/public/icons/`:
- `icon-16.png` — 16×16px
- `icon-48.png` — 48×48px
- `icon-128.png` — 128×128px

Export these from `frontend/public/icon.svg` or create your own.

## Backend Configuration

After loading the extension, note your extension ID from `chrome://extensions`.
Then set it in your backend `.env`:

```env
# Development: allow all extension origins
EXTENSION_ORIGIN=chrome-extension://*

# Production: lock to your specific extension ID
EXTENSION_ORIGIN=chrome-extension://your-extension-id
```

## Project Structure

```
extension/
├── manifest.json           # Chrome MV3 manifest
├── vite.config.ts          # Vite + @crxjs build config
├── src/
│   ├── types/index.ts      # Shared data types
│   ├── lib/
│   │   ├── supabase.ts     # Supabase client (chrome.storage adapter)
│   │   └── api.ts          # Backend API wrapper with retry logic
│   ├── background/
│   │   └── service-worker.ts
│   └── popup/
│       ├── App.tsx         # Root component + state machine
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── ScanScreen.tsx
│       │   ├── ProgressScreen.tsx
│       │   └── ReportScreen.tsx
│       └── components/
│           ├── ScoreBadge.tsx
│           ├── SeverityBadge.tsx
│           └── IssueCard.tsx
```

## What's NOT in the Extension

These features require the full AccessAI website:
- Create an account (sign up)
- Reset password
- View full scan history
- Chat with the AI agent about specific issues

All screens link directly to the website for these actions.
