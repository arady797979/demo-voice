// ── app/api/progress/route.ts ──────────────────────────────────
// Returns parsed lesson reports (scores) for a given session.
import { NextRequest, NextResponse } from 'next/server'
import { getMessageHistory } from '@/lib/cosmos-client'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 })
    }

    const history = await getMessageHistory(sessionId)
    const reports: any[] = []

    for (const msg of history) {
      if (msg.role === 'assistant' && msg.content) {
        // Extract the hidden JSON block
        const match = msg.content.match(/<!--\s*LESSON_REPORT\s*([\s\S]*?)\s*-->/)
        if (match && match[1]) {
          try {
            const reportData = JSON.parse(match[1])
            reports.push({
              timestamp: msg.timestamp,
              report: reportData
            })
          } catch (e) {
            console.warn(`[api/progress] Failed to parse LESSON_REPORT JSON for session ${sessionId}`)
          }
        }
      }
    }

    return NextResponse.json({ reports })
  } catch (err) {
    console.error('[api/progress] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
