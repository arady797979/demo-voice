// ── Shared TypeScript Types ────────────────────────────────────
// Single source of truth for all data shapes used across
// components, hooks, and API routes.

// ── Messages ────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url: string          // Blob Storage URL
  status: 'uploading' | 'processing' | 'ready' | 'error'
  progress?: number
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  attachments?: Attachment[]
  isStreaming?: boolean
  tokens?: number
}

// ── Session ─────────────────────────────────────────────────────
export interface Session {
  id: string
  userId?: string
  messages: Message[]
  summary?: string
  createdAt: Date
  updatedAt: Date
  attachments?: Attachment[]
}

// ── Voice ────────────────────────────────────────────────────────
export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'

export interface VoiceSession {
  state: VoiceState
  transcript: string          // current in-progress transcript
  error?: string
}

// ── File Upload ──────────────────────────────────────────────────
export interface UploadedFile {
  id: string
  name: string
  size: number
  mimeType: string
  blobUrl: string
  sessionId: string
  indexed: boolean
  uploadedAt: Date
}

// ── API Payloads ─────────────────────────────────────────────────
export interface ChatRequest {
  sessionId: string
  message: string
  attachmentIds?: string[]
}

export interface ChatResponse {
  content: string
  sessionId: string
  messageId: string
}

export interface TokenResponse {
  token: string
  endpoint: string
  deployment: string
  expiresAt: string
}

export interface SasResponse {
  sasUrl: string
  blobUrl: string
  expiresAt: string
}

// ── UI State ─────────────────────────────────────────────────────
export type PanelMode = 'chat' | 'voice' | 'split'

export interface UIState {
  panelMode: PanelMode
  sidebarOpen: boolean
  fileUploaderOpen: boolean
}
