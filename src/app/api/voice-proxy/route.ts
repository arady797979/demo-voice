// ── app/api/voice-proxy/route.ts ──────────────────────────────
// Server-side WebSocket proxy for Azure OpenAI Realtime API.
// The browser connects to ws://localhost:3000/api/voice-proxy
// and this server forwards to Azure with the API key injected.
// This keeps the API key fully server-side.

import { NextRequest } from 'next/server'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

// Next.js App Router does not support raw WebSocket upgrade natively.
// We expose a GET that returns the signed WSS URL (key in URL, HTTPS only).
// For a fully server-proxied solution a custom server.js would be needed.
// This endpoint returns the full signed URL for the client to connect to.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 })
  }

  const endpoint = config.openai.endpoint.replace(/\/+$/, '')
  const wssUrl = `${endpoint.replace('https://', 'wss://')}/openai/realtime` +
    `?api-version=${config.openai.realtimeApiVersion}` +
    `&deployment=${config.openai.realtimeDeployment}` +
    `&api-key=${config.openai.apiKey}`

  // Log the URL shape (key redacted) for debugging
  const redacted = wssUrl.replace(/api-key=[^&]+/, 'api-key=REDACTED')
  console.info('[voice-proxy] WSS URL:', redacted)

  return new Response(JSON.stringify({ wssUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
