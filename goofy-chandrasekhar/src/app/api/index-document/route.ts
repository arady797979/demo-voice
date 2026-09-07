// ── app/api/index-document/route.ts ─────────────────────────
// Downloads from Blob Storage, extracts text via Document Intelligence,
// chunks it, and indexes chunks into AI Search.

import { NextRequest, NextResponse } from 'next/server'
import { indexDocument, ensureIndexExists } from '@/lib/search-client'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, blobUrl, fileName } = await req.json()
    if (!sessionId || !blobUrl || !fileName) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // Download blob content
    const blobRes = await fetch(blobUrl)
    if (!blobRes.ok) throw new Error('Failed to fetch blob')
    const text = await blobRes.text()

    // Simple chunking (500 word chunks with 50 word overlap)
    const words  = text.split(/\s+/)
    const chunks: string[] = []
    const CHUNK  = 500
    const OVERLAP = 50
    for (let i = 0; i < words.length; i += CHUNK - OVERLAP) {
      chunks.push(words.slice(i, i + CHUNK).join(' '))
    }

    // Ensure search index exists, then index
    await ensureIndexExists()
    await indexDocument(sessionId, fileName, chunks)

    return NextResponse.json({ indexed: true, chunks: chunks.length })
  } catch (err) {
    console.error('[/api/index-document]', err)
    // Non-fatal — app still works without RAG
    return NextResponse.json({ indexed: false, error: String(err) }, { status: 200 })
  }
}
