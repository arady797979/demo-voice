// ── app/api/realtime-token/route.ts ──────────────────────────────
// Returns the local WebSocket proxy URL for voice sessions.
// The browser connects to /ws/realtime on this server — NOT directly to Azure.
// The server.js custom server proxies to Azure with the api-key server-side,
// so no Azure AD browser credentials can interfere with the api-key auth.

import { NextRequest, NextResponse } from 'next/server'
import { VOICE_SYSTEM_PROMPT, AGENT_CONFIG } from '../../../../system_instructions'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  // Return the local proxy WS URL — browser connects here, server forwards to Azure.
  // Dynamically build from the incoming request host so it works in any environment.
  const host   = req.headers.get('host') || 'localhost:3000'
  const scheme = req.headers.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws'
  const wsUrl  = `${scheme}://${host}/ws/realtime`

  console.info('[realtime-token] Issuing proxy URL:', wsUrl)

  return NextResponse.json({
    wsUrl,
    voice:        AGENT_CONFIG.voice,
    systemPrompt: VOICE_SYSTEM_PROMPT,
  })
}
