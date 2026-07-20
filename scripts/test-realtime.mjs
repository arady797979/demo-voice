#!/usr/bin/env node
// Test Azure OpenAI Realtime WebSocket from Node.js (server-side, no browser credentials)
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { WebSocket } from 'ws'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath   = join(__dirname, '..', '.env')

// Parse .env manually (no dotenv needed)
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
} catch { console.warn('No .env found, using process.env') }

const ENDPOINT   = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '')
const DEPLOYMENT = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-realtime-2-1'
const API_VER    = process.env.AZURE_OPENAI_REALTIME_API_VERSION || '2025-04-01-preview'
const KEY        = process.env.AZURE_OPENAI_API_KEY || ''

const wssUrl = `${ENDPOINT.replace('https://', 'wss://')}/openai/realtime` +
  `?api-version=${API_VER}&deployment=${DEPLOYMENT}&api-key=${KEY}`

console.log('Connecting to:', wssUrl.replace(/api-key=[^&]+/, 'api-key=REDACTED'))
console.log('Deployment:', DEPLOYMENT, '| API Version:', API_VER)
console.log('---')

const ws = new WebSocket(wssUrl)

const timer = setTimeout(() => {
  console.error('TIMEOUT: No response in 10s')
  ws.terminate()
  process.exit(1)
}, 10000)

ws.on('open', () => {
  console.log('✓ WebSocket CONNECTED (HTTP 101)')
  console.log('Sending session.update...')
  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      voice: 'coral',
      instructions: 'You are a helpful assistant.',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: { type: 'server_vad', threshold: 0.4, prefix_padding_ms: 200, silence_duration_ms: 600, create_response: true },
    },
  }))
})

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString())
    console.log(`← ${msg.type}`, msg.type === 'error' ? JSON.stringify(msg.error) : '')
    if (msg.type === 'session.updated') {
      console.log('\n✓ SESSION READY — voice mode should work!')
      clearTimeout(timer)
      ws.close()
      process.exit(0)
    }
    if (msg.type === 'error') {
      console.error('\n✗ API ERROR:', JSON.stringify(msg.error, null, 2))
      clearTimeout(timer)
      ws.close()
      process.exit(1)
    }
  } catch (e) {
    console.log('← (binary or parse error)')
  }
})

ws.on('error', (err) => {
  console.error('✗ WS ERROR:', err.message)
  clearTimeout(timer)
  process.exit(1)
})

ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} ${reason.toString()}`)
  clearTimeout(timer)
})
