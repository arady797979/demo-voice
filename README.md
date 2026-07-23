# ARIA — Adaptive Reasoning & Intelligence Agent

> A production-grade AI voice + chat agent built entirely on the Azure ecosystem.
> Real-time voice conversations, streaming text chat, file uploads with RAG, and persistent session memory.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Voice Conversations** | Real-time WebSocket voice via Azure OpenAI Realtime API — VAD, interruption handling, natural speech |
| **Streaming Chat** | Token-by-token streaming responses with markdown rendering |
| **File Uploads** | Drag-and-drop any file — PDF, DOCX, images — indexed for RAG retrieval |
| **Session Memory** | Persistent conversation history via Azure Cosmos DB |
| **System Instructions** | Single `system_instructions.ts` file to tune personality, guardrails, and behavior |
| **Health Dashboard** | `GET /api/health` to verify all Azure service connectivity |

---

## 📁 Project Structure

```
aria-agent/
├── system_instructions.ts        # ⭐ Master agent config (edit this!)
├── .env                          # Azure keys (never commit)
├── .env.example                  # Safe template
├── next.config.js                # Next.js 15 config
├── package.json                  # Scripts & dependencies
├── tsconfig.json                 # TypeScript config
│
├── src/
│   ├── types/
│   │   ├── index.ts              # All shared TypeScript types
│   │   └── azure-modules.d.ts    # Azure SDK type declarations
│   │
│   ├── lib/                      # Server-side service layer
│   │   ├── config.ts             # Environment variable reader
│   │   ├── logger.ts             # Structured debug logger
│   │   ├── openai-client.ts      # Azure OpenAI singleton
│   │   ├── cosmos-client.ts      # Cosmos DB session CRUD
│   │   └── search-client.ts      # AI Search RAG retrieval
│   │
│   ├── hooks/                    # Client-side business logic
│   │   ├── useSession.ts         # Session ID management
│   │   ├── useChatSession.ts     # Streaming chat completions
│   │   ├── useVoiceSession.ts    # Realtime WebSocket voice
│   │   └── useFileUpload.ts      # SAS token + Blob upload
│   │
│   ├── components/               # Pure UI components
│   │   ├── VoiceOrb/             # Animated voice orb + wave bars
│   │   ├── ChatPanel/            # Message list, input, markdown
│   │   └── FileUploader/         # Drag-and-drop upload zone
│   │
│   └── app/                      # Next.js App Router
│       ├── layout.tsx            # Root layout + metadata
│       ├── globals.css           # Design system tokens
│       ├── page.tsx              # Main app (voice + chat)
│       ├── page.module.css       # Page layout styles
│       └── api/
│           ├── chat/route.ts             # Streaming chat endpoint
│           ├── health/route.ts           # Service health check
│           ├── realtime-token/route.ts   # Voice session token
│           ├── upload-sas/route.ts       # File upload SAS URL
│           └── index-document/route.ts   # Document RAG indexing
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ installed
- **Azure account** with an Azure OpenAI resource
- Model deployments created in [Azure AI Foundry](https://ai.azure.com):
  - `gpt-4o-mini` (for text chat)
  - `gpt-4o-realtime-preview` (for voice — optional)

### 1. Clone & Navigate

```bash
cd C:\Users\Administrator\Documents\antigravity\goofy-chandrasekhar
```

> **Important:** All commands must be run from this project root directory.

### 2. Install Dependencies

```bash
npm install
```

This installs Next.js, React, Azure SDKs, and all other dependencies (~544 packages).

### 3. Configure Environment

Copy the template and fill in your Azure keys:

```bash
copy .env.example .env
```

Then edit `.env` with your values:

```env
# Required — Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini      # your deployment name

# Optional — Voice (if you have Realtime model deployed)
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-voice

# Optional — File Upload + RAG
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-search-key

# Optional — Session Memory
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-key
```

> **Note:** The app works in degraded mode — chat works with just OpenAI keys. Cosmos, Storage, and Search are optional (features gracefully disable if not configured).

### 4. Start the Server

**Clean start (recommended after config changes or first run):**

```bash
npm run clean && npm run dev
```

`npm run clean` wipes the `.next` build cache. `npm run dev` then boots the custom Node server (`server.js`) which starts Next.js on port 3000.

**Regular start:**

```bash
npm run dev
```

Expected output:

```
▲ Next.js 15.1.0
  - Local:   http://localhost:3000
  - Network: http://0.0.0.0:3000
✓ Ready in ~6s
```

Open **http://localhost:3000** in your browser.

### 5. Verify Services (Optional)

While the dev server is running, check which Azure services are connected:

```bash
npm run health
```

Or open in browser: **http://localhost:3000/api/health**

This returns a JSON report showing the status of each Azure service.

---

## 📋 All Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run dev:debug` | Start with Node.js inspector (attach VS Code debugger) |
| `npm run build` | Type-check + production build |
| `npm run start` | Serve production build on port 3000 |
| `npm run typecheck` | TypeScript type checking only |
| `npm run lint` | ESLint check |
| `npm run clean` | Wipe `.next` build cache |
| `npm run health` | Ping health endpoint from CLI |

---

## 🎛️ Customizing the Agent

Edit **`system_instructions.ts`** in the project root. No other files need to change.

```typescript
export const AGENT_CONFIG = {
  name: 'Aria',                          // Change the agent's name
  voice: 'coral',                        // alloy | ash | coral | echo | sage | shimmer
  tone: 'professional yet warm',         // Personality description
  memoryWindowSize: 20,                  // Messages before summarization
}
```

You can also edit:
- `CHAT_SYSTEM_PROMPT` — controls text chat behavior
- `VOICE_SYSTEM_PROMPT` — controls voice conversation style
- `RAG_CONTEXT_TEMPLATE` — how document context is injected
- `VAD_CONFIG` — voice activity detection sensitivity

---

## 🏗️ Architecture

```
Browser                          Azure Cloud
┌──────────────┐                ┌─────────────────────┐
│  Chat UI     │──── SSE ──────▶│ /api/chat           │──▶ Azure OpenAI (gpt-4o-mini)
│  Voice Orb   │──── WSS ──────▶│ Azure Realtime API  │──▶ Azure OpenAI (Realtime)
│  File Upload │──── PUT ──────▶│ Azure Blob Storage  │
└──────────────┘                └─────────────────────┘
                                         │
                                         ▼
                                ┌─────────────────────┐
                                │ Azure Cosmos DB      │ ← Session memory
                                │ Azure AI Search      │ ← RAG document index
                                │ Azure Doc Intel      │ ← Text extraction
                                └─────────────────────┘
```

---

## 🐛 Debugging

### Structured Logs
All API routes output color-coded, timestamped logs in the terminal:
```
21:37:15.123 INFO  [api/chat] → POST /api/chat {"sessionId":"abc","messageLen":42}
21:37:15.456 DEBUG [api/chat] OpenAI stream completed (234.5ms)
```

### VS Code Debugger
```bash
npm run dev:debug
```
Then attach the VS Code Node.js debugger to port `9229`.

### Health Check
```bash
curl http://localhost:3000/api/health | jq .
```

---

## ⚠️ Known Issues

- **SWC warning**: `@next/swc-win32-x64-msvc is not a valid Win32 application` — harmless. Next.js falls back to WASM compilation automatically. Does not affect functionality.
- **Turbopack**: Not supported on this system's WASM fallback. Standard Webpack dev server is used instead.

---

## 📄 License

Private project — all rights reserved.
