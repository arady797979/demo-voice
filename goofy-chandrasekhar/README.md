# 🎙️ Knowvoro — Multimodal AI Voice & Chat Assistant

> **Production-grade, real-time AI voice and streaming chat assistant powered by Azure OpenAI and Next.js 15.**
> Featuring bidirectional WebSocket voice conversation, token streaming chat, document RAG, persistent session memory, and fully customizable agent personas.

---

## 🌟 Overview

Knowvoro is an enterprise-ready conversational AI platform designed for low-latency voice interaction, rich chat experiences, and document-grounded intelligence. It leverages the Azure ecosystem for high reliability, security, and scalability.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 KNOWVORO                                    │
│  ┌─────────────────────────┐                   ┌─────────────────────────┐  │
│  │   🎙️ Realtime Voice      │                   │   💬 Streaming Chat     │  │
│  │  Low-latency WebSocket  │                   │  Token-by-token render  │  │
│  │  VAD + Orb Animation    │                   │  Markdown + Code blocks │  │
│  └────────────┬────────────┘                   └────────────┬────────────┘  │
│               │                                             │               │
│               ▼                                             ▼               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  ⚡ Next.js 15 + Custom Proxy Server                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│         │                         │                         │               │
│         ▼                         ▼                         ▼               │
│  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐       │
│  │ Azure OpenAI │          │ Azure Cosmos │          │  Azure Blob  │       │
│  │ Chat + Voice │          │ Session DB   │          │ + AI Search  │       │
│  └──────────────┘          └──────────────┘          └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **🎙️ Low-Latency Voice** | Real-time bidirectional voice via Azure OpenAI Realtime WebSocket proxy with Voice Activity Detection (VAD) and interruption handling |
| **💬 Streaming Chat** | Token-by-token streaming responses with full Markdown rendering, GitHub-flavored tables, and syntax-highlighted code blocks |
| **📁 Document RAG** | Drag-and-drop file uploader supporting PDF, DOCX, TXT, and images with automatic text extraction and vector search |
| **🧠 Persistent Memory** | Session-based state management and conversation history stored in Azure Cosmos DB |
| **🎭 Pluggable Personas** | Centralized `system_instructions.ts` to customize agent identity (e.g. *Hala – Grade 3 English Teacher*), voice, tone, and guardrails |
| **🩺 Health Monitoring** | Built-in health check endpoint (`/api/health`) and CLI health test script for Azure service connectivity |
| **🛡️ Graceful Degradation** | Runs out of the box with only Azure OpenAI credentials; optional services (Cosmos, Search, Storage) deactivate smoothly if unconfigured |

---

## 📁 Project Structure

```
.
├── system_instructions.ts        # ⚙️ Master Agent Config (Identity, Prompts & Tone)
├── server.js                     # ⚡ Custom Next.js server with Realtime WebSocket Proxy
├── .env.example                  # 📋 Environment variables template
├── next.config.js                # ⚙️ Next.js 15 configuration
├── package.json                  # 📦 Dependencies & run scripts
├── tsconfig.json                 # 🔷 TypeScript configuration
│
├── src/
│   ├── types/
│   │   ├── index.ts              # Global TypeScript interfaces and types
│   │   └── azure-modules.d.ts    # Azure SDK type declarations
│   │
│   ├── lib/                      # Server-side services & clients
│   │   ├── config.ts             # Environment variable validation & loader
│   │   ├── logger.ts             # Structured, timestamped debug logger
│   │   ├── openai-client.ts      # Azure OpenAI client singleton
│   │   ├── cosmos-client.ts      # Azure Cosmos DB session persistence
│   │   └── search-client.ts      # Azure AI Search indexing & RAG retrieval
│   │
│   ├── hooks/                    # Client-side React hooks
│   │   ├── useSession.ts         # Session UUID & storage management
│   │   ├── useChatSession.ts     # SSE-based streaming chat completions
│   │   ├── useVoiceSession.ts    # Web Audio API & Realtime WebSocket client
│   │   └── useFileUpload.ts      # Drag-and-drop SAS token upload handler
│   │
│   ├── components/               # Modular UI Components
│   │   ├── VoiceOrb/             # Animated SVG/Canvas voice visualizer & waves
│   │   ├── ChatPanel/            # Message thread, input bar, Markdown renderer
│   │   └── FileUploader/         # Drag-and-drop file upload target & progress
│   │
│   └── app/                      # Next.js App Router
│       ├── layout.tsx            # Root HTML layout and metadata
│       ├── page.tsx              # Main UI dashboard (Voice Orb + Chat Panel)
│       ├── globals.css           # Design tokens, themes, and CSS variables
│       └── api/                  # API Route Handlers
│           ├── chat/route.ts             # Streaming text chat completions
│           ├── health/route.ts           # Azure services health check
│           ├── realtime-token/route.ts   # Realtime voice session credentials
│           ├── upload-sas/route.ts       # Secure Azure Blob Storage SAS generation
│           └── index-document/route.ts   # Document ingestion & RAG indexing
│
└── scripts/                      # Diagnostic and deployment utilities
    ├── test-models.mjs           # Model validation test script
    ├── test-realtime.mjs         # Realtime WebSocket connectivity tester
    └── provision.sh              # Azure infrastructure automation script
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** (comes with Node.js)
- An active **Azure Subscription** with an **Azure OpenAI** resource

---

### Step 1: Install Dependencies

```bash
npm install
```

---

### Step 2: Configure Environment Variables

Create your local `.env` file from the provided template:

```bash
# Windows Command Prompt
copy .env.example .env

# PowerShell / Bash / macOS / Linux
cp .env.example .env
```

Open `.env` and fill in your Azure credentials:

```env
# ── Required: Azure OpenAI ─────────────────────────────────────────
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini-chat

# ── Optional: Realtime Voice (if deployed) ──────────────────────────
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-voice
AZURE_OPENAI_REALTIME_API_VERSION=2025-04-01-preview

# ── Optional: Azure Blob Storage (for Document RAG) ─────────────────
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME=agent-uploads

# ── Optional: Azure Cosmos DB (for Session Persistence) ─────────────
AZURE_COSMOS_ENDPOINT=https://your-cosmos-db.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-key
AZURE_COSMOS_DATABASE=agent-db
AZURE_COSMOS_CONTAINER=sessions

# ── Optional: Azure AI Search (for Document Ingestion) ──────────────
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key
AZURE_SEARCH_INDEX_NAME=agent-docs

# ── Optional: Azure Document Intelligence ───────────────────────────
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-doc-intel.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-doc-intel-key
```

> 💡 **Quick Test Tip:** You only need `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_CHAT_DEPLOYMENT` to start chatting immediately!

---

### Step 3: Run the Development Server

Start the local server with WebSocket proxy support:

```bash
npm run dev
```

> **First run / fresh cache:** Run `npm run clean && npm run dev` to clear any stale Next.js cache.

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts the custom Node.js server with WebSocket proxy (`server.js`) on port 3000 |
| `npm run dev:next` | Starts standard Next.js development server (`next dev`) |
| `npm run dev:debug` | Starts dev server with Node inspector enabled on port `9229` for VS Code debugging |
| `npm run clean` | Removes `.next` build cache |
| `npm run typecheck` | Validates TypeScript types across the entire codebase |
| `npm run lint` | Runs ESLint to verify code quality and style standards |
| `npm run build` | Builds the optimized production application |
| `npm run start` | Runs the production build on port 3000 |
| `npm run health` | Pings the `/api/health` endpoint and outputs JSON service status |
| `npm run test:models`| Validates configured Azure model deployments |

---

## 🎭 Customizing the Agent Persona

All agent behavior, identity, prompts, and tone are configured in a single file: **[`system_instructions.ts`](./system_instructions.ts)**.

### Example Configuration

```typescript
export const AGENT_CONFIG = {
  // Agent Identity
  name: 'Hala',
  tagline: 'Grade 3 English Teacher & Language Guide',

  // Voice Persona (alloy | ash | ballad | coral | echo | sage | shimmer | verse)
  voice: 'coral' as const,

  // Language & Demeanor
  language: 'en-US',
  tone: 'encouraging, patient, warm, and playful',

  // Session Memory Settings
  memoryWindowSize: 20,
  summarizeAfter: 15,
}
```

### Configurable Prompts:
- **`CHAT_SYSTEM_PROMPT`**: Guides formatting, tone, lesson structure, error correction, and personalization in text chat.
- **`VOICE_SYSTEM_PROMPT`**: Tailors natural, short-sentence verbal responses optimized for voice interaction.
- **`RAG_CONTEXT_TEMPLATE`**: Formats how uploaded documents are injected into the LLM context.
- **`VAD_CONFIG`**: Adjusts Voice Activity Detection sensitivity and silence duration.

---

## 🌐 API & WebSocket Reference

### HTTP Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Server-Sent Events (SSE) streaming chat completions |
| `GET` | `/api/health` | Comprehensive status of all configured Azure services |
| `POST` | `/api/realtime-token` | Ephemeral session token generator for voice sessions |
| `POST` | `/api/upload-sas` | Generates a time-limited Shared Access Signature (SAS) URL for direct blob uploads |
| `POST` | `/api/index-document`| Extracts document text and indexes into Azure AI Search |

### WebSocket Endpoint

| Protocol | Route | Description |
|---|---|---|
| `WSS` | `/ws/realtime` | Proxies client audio streams to Azure OpenAI Realtime WebSocket securely |

---

## 🩺 Health Check & Diagnostics

Check system health anytime while the server is running:

```bash
# Via CLI script
npm run health

# Or via curl
curl http://localhost:3000/api/health
```

Sample output:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-01T20:15:00.000Z",
  "services": {
    "azureOpenAI": { "status": "connected", "chatModel": "gpt-4o-mini-chat" },
    "realtimeVoice": { "status": "connected", "deployment": "gpt-4o-realtime-voice" },
    "cosmosDB": { "status": "connected" },
    "blobStorage": { "status": "connected" },
    "aiSearch": { "status": "connected" }
  }
}
```

---

## 🔧 Troubleshooting & FAQ

<details>
<summary><b>1. SWC / WASM warning on Windows</b></summary>

If you see `@next/swc-win32-x64-msvc is not a valid Win32 application`, Next.js automatically falls back to WASM compilation. This is completely harmless and does not affect application functionality.
</details>

<details>
<summary><b>2. Realtime voice WebSocket connection fails</b></summary>

- Verify `AZURE_OPENAI_REALTIME_DEPLOYMENT` matches your deployment name in Azure AI Foundry.
- Check that your Azure OpenAI resource region supports the Realtime API (e.g., East US 2, Sweden Central).
- Run `npm run test:models` to verify deployment access.
</details>

<details>
<summary><b>3. App works without Cosmos DB or Search?</b></summary>

Yes! Knowvoro uses modular service adapters. If Cosmos DB or Azure AI Search keys are omitted, the app runs in standard in-memory session mode without document retrieval.
</details>

---

## 📄 License

Private project — all rights reserved.
