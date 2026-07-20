// ── app/api/debug-voice/route.ts ──────────────────────────────
// Debug endpoint: validates Azure OpenAI Realtime connectivity.
// GET /api/debug-voice → returns URL details + HTTP probe result.

import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

export async function GET() {
  const endpoint = config.openai.endpoint.replace(/\/+$/, '')
  const deployment = config.openai.realtimeDeployment
  const apiVersion = config.openai.realtimeApiVersion
  const apiKey     = config.openai.apiKey

  const wsUrl = `${endpoint.replace('https://', 'wss://')}/openai/realtime` +
    `?api-version=${apiVersion}&deployment=${deployment}&api-key=REDACTED`

  // Probe the REST API for this deployment to confirm it exists
  let probeStatus: number | null = null
  let probeBody: string | null   = null
  try {
    const probeUrl = `${endpoint}/openai/deployments/${deployment}/models?api-version=${apiVersion}`
    const res = await fetch(probeUrl, {
      headers: { 'api-key': apiKey },
    })
    probeStatus = res.status
    probeBody   = await res.text()
  } catch (e) {
    probeBody = String(e)
  }

  // Also check available deployments
  let deploymentsBody: string | null = null
  try {
    const res = await fetch(`${endpoint}/openai/deployments?api-version=2024-10-21`, {
      headers: { 'api-key': apiKey },
    })
    deploymentsBody = await res.text()
  } catch (e) {
    deploymentsBody = String(e)
  }

  return NextResponse.json({
    config: {
      endpoint,
      deployment,
      apiVersion,
      chatDeployment: config.openai.chatDeployment,
      apiKeyPrefix: apiKey.slice(0, 8) + '...',
    },
    wsUrlShape: wsUrl,
    probe: { status: probeStatus, body: probeBody },
    deployments: deploymentsBody,
  }, { status: 200 })
}
