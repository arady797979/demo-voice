'use client'
// ── components/VoiceOrb/VoiceOrb.tsx ─────────────────────────
// Pure UI component — renders the animated orb.
// Receives state + callbacks from parent. No side effects.

import { useEffect, useRef } from 'react'
import type { VoiceState } from '@/types'
import styles from './VoiceOrb.module.css'
import clsx from 'clsx'

interface VoiceOrbProps {
  state:      VoiceState
  transcript: string
  audioLevel: number
  onStart:    () => void
  onStop:     () => void
  error?:     string | null
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle:       'Tap to speak',
  connecting: 'Connecting…',
  listening:  'Listening',
  thinking:   'Thinking…',
  speaking:   'Speaking',
  error:      'Error',
}

const NUM_BARS = 7

export function VoiceOrb({ state, transcript, audioLevel, onStart, onStop, error }: VoiceOrbProps) {
  const barRefs = useRef<HTMLDivElement[]>([])
  const animFrame = useRef<number | null>(null)

  // Animate wave bars based on state + audio level
  useEffect(() => {
    const animate = () => {
      barRefs.current.forEach((bar, i) => {
        if (!bar) return
        let height: number
        const t = Date.now() / 400

        if (state === 'listening') {
          height = 10 + audioLevel * 140 * (0.5 + 0.5 * Math.sin(t + i * 0.8))
        } else if (state === 'speaking') {
          height = 16 + 60 * Math.abs(Math.sin(t * 1.5 + i * 0.9))
        } else if (state === 'thinking') {
          height = 8 + 24 * Math.abs(Math.sin(t * 0.6 + i * 0.5))
        } else {
          height = 4
        }

        bar.style.height = `${Math.max(4, Math.min(56, height))}px`
      })
      animFrame.current = requestAnimationFrame(animate)
    }
    animate()
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }
  }, [state, audioLevel])

  const isActive = state !== 'idle' && state !== 'error'
  const isClickable = state === 'idle' || state === 'error'

  return (
    <div className={styles.container}>
      {/* Ring */}
      <div className={styles.orbWrapper}>
        <div className={clsx(styles.orbRing, isActive && styles.active)} />

        {/* Orb button */}
        <button
          id="voice-orb-btn"
          className={clsx(styles.orb, styles[state])}
          onClick={isClickable ? onStart : undefined}
          aria-label={STATE_LABELS[state]}
          aria-pressed={isActive}
          disabled={state === 'connecting'}
        >
          <span className={styles.orbIcon}>
            {state === 'idle' && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
            )}
            {state === 'connecting' && (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            )}
            {state === 'listening' && (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" fill="white" opacity="0.9"/>
                <circle cx="12" cy="12" r="6" stroke="white" strokeOpacity="0.5"/>
                <circle cx="12" cy="12" r="9" stroke="white" strokeOpacity="0.2"/>
              </svg>
            )}
            {state === 'thinking' && (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="1" fill="white"/>
                <circle cx="19" cy="12" r="1" fill="white"/>
                <circle cx="5"  cy="12" r="1" fill="white"/>
              </svg>
            )}
            {state === 'speaking' && (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round"/>
              </svg>
            )}
            {state === 'error' && (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
          </span>
        </button>
      </div>

      {/* Wave visualizer */}
      <div className={styles.waveContainer} aria-hidden>
        {Array.from({ length: NUM_BARS }).map((_, i) => (
          <div
            key={i}
            ref={el => { if (el) barRefs.current[i] = el }}
            className={clsx(styles.waveBar, styles[state])}
          />
        ))}
      </div>

      {/* Status label */}
      <span className={clsx(styles.statusLabel, isActive && styles.active)}>
        {STATE_LABELS[state]}
      </span>

      {/* Live transcript */}
      {transcript && (
        <p className={styles.transcript}>
          {transcript}
          {state === 'listening' && <span className={styles.cursor} aria-hidden />}
        </p>
      )}

      {/* Error message */}
      {error && state === 'error' && (
        <p style={{ color: 'var(--state-error)', fontSize: 13 }}>{error}</p>
      )}

      {/* Stop button when active */}
      {isActive && (
        <button id="voice-stop-btn" className={styles.stopBtn} onClick={onStop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
          End conversation
        </button>
      )}
    </div>
  )
}
