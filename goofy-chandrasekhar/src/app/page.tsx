'use client'
// ── app/page.tsx ──────────────────────────────────────────────
// The main layout. Composes all hooks and pure UI components.

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useChatSession } from '@/hooks/useChatSession'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { useFileUpload } from '@/hooks/useFileUpload'

import { VoiceOrb } from '@/components/VoiceOrb/VoiceOrb'
import { ChatPanel } from '@/components/ChatPanel/ChatPanel'

import styles from './page.module.css'

export default function App() {
  const { sessionId, resetSession } = useSession()
  const [voiceMode, setVoiceMode] = useState(false)

  // Hooks (decoupled business logic)
  const chat = useChatSession({ sessionId })
  const voice = useVoiceSession({
    sessionId,
    onAssistantText: (_text) => {
      // Future: mirror voice transcript into chat panel
    },
  })
  const uploader = useFileUpload({ sessionId })

  // Mode switching
  const handleStartVoice = () => {
    setVoiceMode(true)
    voice.start()
  }
  const handleStopVoice = () => {
    voice.stop()
    setVoiceMode(false)
  }
  const handleReset = () => {
    resetSession()
    chat.clearMessages()
    uploader.clearAttachments()
    voice.stop()
    setVoiceMode(false)
  }

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>Knowvoro</h1>
            <p className={styles.subtitle}>Knowledge. Reimagined.</p>
          </div>
        </div>

        <button className={styles.resetBtn} onClick={handleReset} title="New Session">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          New Chat
        </button>
      </header>

      {/* Main Layout Area */}
      <div className={styles.content}>
        {/* Left Side — ARIA's Voice Presence */}
        <section className={styles.voiceSection}>
          <div className={styles.orbContainer}>
            <VoiceOrb
              state={voice.state}
              transcript={voice.transcript}
              audioLevel={voice.audioLevel}
              onStart={handleStartVoice}
              onStop={handleStopVoice}
              error={voice.error}
            />
          </div>

          <div className={styles.voiceInfo}>
            <h3>{voiceMode ? 'Voice Mode Active' : 'Voice Mode Standby'}</h3>
            <p>
              {voiceMode
                ? 'Knowvoro is listening. Speak naturally, you can interrupt at any time.'
                : 'Tap the orb to switch to low-latency voice conversation.'}
            </p>
          </div>
        </section>

        {/* Right Side — Chat Interface */}
        <section className={styles.chatSection}>
          <ChatPanel
            messages={chat.messages}
            isLoading={chat.isLoading}
            error={chat.error}
            attachments={uploader.attachments}
            isDragging={uploader.isDragging}
            onSend={(text, atts) => {
              if (voiceMode) handleStopVoice()
              chat.sendMessage(text, atts)
              uploader.clearAttachments()
            }}
            onStop={chat.stopStreaming}
            onFiles={uploader.uploadFiles}
            onRemoveFile={uploader.removeAttachment}
            dragHandlers={uploader.dragHandlers}
          />
        </section>
      </div>
    </main>
  )
}
