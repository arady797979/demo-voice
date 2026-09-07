// ── hooks/useSession.ts ──────────────────────────────────────
// Manages the session ID — creates one on mount and persists it.
// Completely decoupled from chat/voice logic.

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'

const SESSION_KEY = 'aria_session_id'

export function useSession() {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = uuidv4()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    setSessionId(id)
  }, [])

  const resetSession = () => {
    const newId = uuidv4()
    sessionStorage.setItem(SESSION_KEY, newId)
    setSessionId(newId)
  }

  return { sessionId, resetSession }
}
