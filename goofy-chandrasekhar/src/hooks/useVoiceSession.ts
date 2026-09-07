// ── hooks/useVoiceSession.ts ─────────────────────────────────
// Azure OpenAI Realtime API — full voice session management.
// Handles: WebSocket, PCM16 audio, VAD, interruptions, playback.
// Zero UI code. Returns pure state + controls.

'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { VoiceState } from '@/types'

const SAMPLE_RATE = 24000
const CHUNK_SIZE  = 4096

interface UseVoiceSessionOptions {
  sessionId: string
  onTranscript?: (text: string) => void
  onAssistantText?: (text: string) => void
}

export function useVoiceSession({
  sessionId, onTranscript, onAssistantText,
}: UseVoiceSessionOptions) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  const wsRef            = useRef<WebSocket | null>(null)
  const audioCtxRef      = useRef<AudioContext | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const processorRef     = useRef<ScriptProcessorNode | null>(null)
  const playbackQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef     = useRef(false)
  const isResponseActive = useRef(false)   // true while Azure is generating a response
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // ── Cleanup ────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    currentSourceRef.current?.stop()
    currentSourceRef.current = null
    playbackQueueRef.current = []
    isPlayingRef.current = false
    setAudioLevel(0)
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  // ── Float32 → PCM16 conversion ─────────────────────────────
  const float32ToPcm16 = (float32: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32.length * 2)
    const view   = new DataView(buffer)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
    return buffer
  }

  // ── Base64 → Float32 ──────────────────────────────────────
  const base64ToFloat32 = (b64: string): Float32Array => {
    const binary = atob(b64)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const int16 = new Int16Array(bytes.buffer)
    const float = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float[i] = int16[i] / 0x7FFF
    return float
  }

  // ── Playback queue ────────────────────────────────────────
  const playNextChunk = useCallback(() => {
    if (!audioCtxRef.current || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false
      if (state === 'speaking') setState('listening')
      return
    }
    isPlayingRef.current = true
    const chunk = playbackQueueRef.current.shift()!
    const buffer = audioCtxRef.current.createBuffer(1, chunk.length, SAMPLE_RATE)
    buffer.copyToChannel(chunk as Float32Array<ArrayBuffer>, 0)
    const source = audioCtxRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(audioCtxRef.current.destination)
    source.onended = playNextChunk
    source.start()
    currentSourceRef.current = source
  }, [state])

  // ── Interrupt playback ────────────────────────────────────
  const interruptPlayback = useCallback(() => {
    currentSourceRef.current?.stop()
    currentSourceRef.current = null
    playbackQueueRef.current = []
    isPlayingRef.current = false
  }, [])

  // ── Start voice session ───────────────────────────────────
  const start = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return
    setState('connecting')
    setError(null)
    setTranscript('')

    try {
      // 1. Get base WS URL + api key from backend (key comes over HTTPS, never in URL)
      const res = await fetch(`/api/realtime-token?sessionId=${sessionId}`)
      if (!res.ok) throw new Error('Failed to get voice token')
      const { wsUrl, voice, systemPrompt } = await res.json() as { wsUrl: string; voice: string; systemPrompt: string }
      // Log the URL shape (key redacted) for debugging
      console.info('[voice] Connecting to:', wsUrl.replace(/api-key=[^&]+/, 'api-key=REDACTED'))

      // 2. Setup AudioContext + microphone
      audioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true,
        noiseSuppression: true, autoGainControl: true,
      }})

      const source    = audioCtxRef.current.createMediaStreamSource(streamRef.current)
      const analyser  = audioCtxRef.current.createAnalyser()
      const processor = audioCtxRef.current.createScriptProcessor(CHUNK_SIZE, 1, 1)
      source.connect(analyser)
      source.connect(processor)
      processor.connect(audioCtxRef.current.destination)
      processorRef.current = processor

      // Audio level meter
      const dataArr = new Uint8Array(analyser.frequencyBinCount)
      const measureLevel = () => {
        if (!processorRef.current) return
        analyser.getByteFrequencyData(dataArr)
        const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length
        setAudioLevel(avg / 255)
        requestAnimationFrame(measureLevel)
      }
      measureLevel()

      // Azure OpenAI Realtime: api-key is in the URL, plain WebSocket (no subprotocol auth needed)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setState('listening')
        console.info('[voice] WebSocket opened, sending session.update')
        // Configure session: VAD, voice, system prompt
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: voice || 'coral',
            instructions: systemPrompt || 'You are a helpful assistant.',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.4,
              prefix_padding_ms: 200,
              silence_duration_ms: 600,
              create_response: true,
            },
          },
        }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          // Log key messages for debugging
          if (msg.type === 'error' || msg.type === 'session.created' || msg.type === 'session.updated') {
            console.info('[voice] msg:', msg.type, JSON.stringify(msg).slice(0, 300))
          }
          switch (msg.type) {
            case 'input_audio_buffer.speech_started':
              interruptPlayback()
              setState('listening')
              setTranscript('')
              // Only cancel if Azure is actively generating a response
              if (isResponseActive.current && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'response.cancel' }))
                isResponseActive.current = false
              }
              break

            case 'conversation.item.input_audio_transcription.completed':
              setTranscript(msg.transcript ?? '')
              onTranscript?.(msg.transcript ?? '')
              setState('thinking')
              break

            case 'response.created':
              isResponseActive.current = true
              break

            case 'response.audio.delta':
              setState('speaking')
              isResponseActive.current = true
              // eslint-disable-next-line no-case-declarations
              const audioData = base64ToFloat32(msg.delta)
              playbackQueueRef.current.push(audioData)
              if (!isPlayingRef.current) playNextChunk()
              break

            case 'response.audio_transcript.delta':
              onAssistantText?.(msg.delta ?? '')
              break

            case 'response.done':
              isResponseActive.current = false
              if (playbackQueueRef.current.length === 0) setState('listening')
              break

            case 'error':
              // Suppress non-critical cancel errors (no active response to cancel)
              if (msg.error?.code === 'response_cancel_not_active') break
              console.error('[voice] API error:', JSON.stringify(msg.error))
              setError(msg.error?.message ?? 'Realtime API error')
              setState('error')
              break
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onerror = (ev) => {
        console.error('[voice] WebSocket onerror:', ev)
        setError('WebSocket connection error — check console & /api/debug-voice')
        setState('error')
      }
      ws.onclose = (ev) => {
        console.warn(`[voice] WebSocket closed: code=${ev.code} reason=${ev.reason || '(none)'} wasClean=${ev.wasClean}`)
        if (ev.code === 1006) setError(`Connection refused (code 1006) — deployment may not exist or wrong API version. Check /api/debug-voice`)
        if (state !== 'idle') setState('idle')
      }

      // 4. Stream microphone audio to WebSocket
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return
        const input = e.inputBuffer.getChannelData(0)
        const pcm16 = float32ToPcm16(input)
        const b64   = btoa(String.fromCharCode(...new Uint8Array(pcm16)))
        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: b64 }))
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice'
      setError(msg)
      setState('error')
      cleanup()
    }
  }, [state, sessionId, onTranscript, onAssistantText, cleanup, interruptPlayback, playNextChunk])

  // ── Stop voice session ────────────────────────────────────
  const stop = useCallback(() => {
    cleanup()
    setState('idle')
    setTranscript('')
    setError(null)
  }, [cleanup])

  return { state, transcript, error, audioLevel, start, stop }
}
