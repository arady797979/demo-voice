// ── app/api/chat/route.ts ─────────────────────────────────────
// Streaming chat completions endpoint.
// Maintains session memory via Cosmos DB, RAG via AI Search.

import { NextRequest } from 'next/server'
import { getOpenAIClient } from '@/lib/openai-client'
import { appendMessage, getMessageHistory } from '@/lib/cosmos-client'
import { searchDocuments } from '@/lib/search-client'
import { config } from '@/lib/config'
import { chatLog } from '@/lib/logger'
import { CHAT_SYSTEM_PROMPT, RAG_CONTEXT_TEMPLATE } from '../../../../system_instructions'
import { v4 as uuidv4 } from 'uuid'
import type { Message } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message, attachmentIds = [] } = await req.json()
    chatLog.request('POST', '/api/chat', { sessionId, messageLen: message?.length, attachments: attachmentIds.length })
    if (!sessionId || !message) {
      chatLog.warn('Missing params')
      return new Response('Missing sessionId or message', { status: 400 })
    }

    const client = getOpenAIClient()

    // 1. Retrieve session history from Cosmos DB
    let history: Message[] = []
    try {
      history = await getMessageHistory(sessionId)
    } catch {
      // Cosmos not configured — use in-memory only
    }

    // 2. RAG: search for relevant document context
    let ragContext = ''
    try {
      if (attachmentIds.length > 0 || history.some(m => m.attachments?.length)) {
        ragContext = await searchDocuments(message, sessionId)
      }
    } catch { /* AI Search not configured — skip RAG */ }

    // 3. Build messages array
    const systemContent = ragContext
      ? `${CHAT_SYSTEM_PROMPT}\n\n${RAG_CONTEXT_TEMPLATE(ragContext, 'uploaded document')}`
      : CHAT_SYSTEM_PROMPT

    const apiMessages = [
      { role: 'system' as const, content: systemContent },
      ...history.slice(-20).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ]

    // 4. Stream response from Azure OpenAI
    const stream = await client.chat.completions.create({
      model:                 config.openai.chatDeployment,
      messages:              apiMessages,
      stream:                true,
      max_completion_tokens: 2048,
    })

    // 5. Save user message to Cosmos (best-effort)
    appendMessage(sessionId, {
      id: uuidv4(), role: 'user', content: message, timestamp: new Date(),
    }).catch(() => {})

    // 6. Collect full response and return SSE stream
    let fullContent = ''
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? ''
            if (delta) {
              fullContent += delta
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))

          // Save assistant message to Cosmos
          appendMessage(sessionId, {
            id: uuidv4(), role: 'assistant', content: fullContent, timestamp: new Date(),
          }).catch(() => {})
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (err) {
    chatLog.error('Request failed', { error: err instanceof Error ? err.message : String(err) })
    return new Response('Internal server error', { status: 500 })
  }
}
