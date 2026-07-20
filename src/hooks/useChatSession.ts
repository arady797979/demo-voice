// ── hooks/useChatSession.ts ───────────────────────────────────
// All chat completions logic — streaming, history, attachments.
// Zero UI imports. Returns pure state + actions.

'use client'
import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Message, Attachment } from '@/types'

interface UseChatSessionOptions {
  sessionId: string
}

export function useChatSession({ sessionId }: UseChatSessionOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Append a streaming assistant message
  const appendAssistantChunk = useCallback((id: string, chunk: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, content: m.content + chunk } : m)
    )
  }, [])

  const finalizeAssistantMessage = useCallback((id: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, isStreaming: false } : m)
    )
  }, [])

  const sendMessage = useCallback(async (
    content: string,
    attachments: Attachment[] = []
  ) => {
    if (!sessionId || !content.trim()) return
    setError(null)

    // 1. Add user message immediately
    const userMsg: Message = {
      id: uuidv4(), role: 'user', content, timestamp: new Date(), attachments,
    }
    setMessages(prev => [...prev, userMsg])

    // 2. Add placeholder assistant message (streaming)
    const assistantId = uuidv4()
    const assistantMsg: Message = {
      id: assistantId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true,
    }
    setMessages(prev => [...prev, assistantMsg])
    setIsLoading(true)

    // 3. Stream from API
    abortRef.current = new AbortController()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: content,
          attachmentIds: attachments.map(a => a.id),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const err = await res.text()
        throw new Error(err || 'Chat request failed')
      }

      // Read SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              const chunk = json.choices?.[0]?.delta?.content ?? ''
              if (chunk) appendAssistantChunk(assistantId, chunk)
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        setMessages(prev => prev.filter(m => m.id !== assistantId))
      }
    } finally {
      finalizeAssistantMessage(assistantId)
      setIsLoading(false)
    }
  }, [sessionId, appendAssistantChunk, finalizeAssistantMessage])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, error, sendMessage, stopStreaming, clearMessages }
}
