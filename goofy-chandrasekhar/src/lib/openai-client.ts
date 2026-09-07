// ── lib/openai-client.ts ──────────────────────────────────────
// Pure Azure OpenAI client — no side effects, just the SDK instance.
// Used by API routes only (server-side).

import { AzureOpenAI } from 'openai'
import { config } from './config'

// Singleton chat completions client
let _client: AzureOpenAI | null = null
export function getOpenAIClient(): AzureOpenAI {
  if (!_client) {
    _client = new AzureOpenAI({
      endpoint:   config.openai.endpoint,
      apiKey:     config.openai.apiKey,
      apiVersion: config.openai.apiVersion,
      deployment: config.openai.chatDeployment,
    })
  }
  return _client
}

// Build Realtime WebSocket URL (used server-side to generate token URL)
export function getRealtimeWsUrl(deployment: string): string {
  const base = config.openai.endpoint.replace(/\/+$/, '').replace('https://', 'wss://')
  return `${base}/openai/realtime?api-version=${config.openai.realtimeApiVersion}&deployment=${deployment}`
}
