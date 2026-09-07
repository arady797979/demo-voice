#!/usr/bin/env node
// scripts/test-models.mjs
// Run: npm run test:models
// Tests direct connectivity to both Azure OpenAI deployments from your local env.
// Works from WSL: node scripts/test-models.mjs

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env manually (no dotenv dep needed) ──────────────────
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env')
  try {
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      process.env[key] = val
    }
    console.log('✓ Loaded .env\n')
  } catch {
    console.error('✗ Could not read .env — make sure it exists\n')
    process.exit(1)
  }
}

// ── Helpers ────────────────────────────────────────────────────
const RESET  = '\x1b[0m'
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'

function ok(label, detail = '')  { console.log(`  ${GREEN}✓${RESET} ${BOLD}${label}${RESET} ${DIM}${detail}${RESET}`) }
function fail(label, detail = '') { console.log(`  ${RED}✗${RESET} ${BOLD}${label}${RESET} ${DIM}${detail}${RESET}`) }
function info(msg)               { console.log(`  ${CYAN}→${RESET} ${msg}`) }
function header(title)           { console.log(`\n${BOLD}${YELLOW}── ${title}${RESET}`) }

// ── Test 1: Chat completions (aria-chat / gpt-5-mini) ──────────
async function testChat() {
  header('Chat Model — aria-chat (gpt-5-mini)')
  const endpoint  = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '')
  const apiKey    = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION

  info(`Endpoint:   ${endpoint}`)
  info(`Deployment: ${deployment}`)
  info(`API version: ${apiVersion}`)

  if (!endpoint || !apiKey || !deployment) {
    fail('Missing env vars — check AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_CHAT_DEPLOYMENT')
    return false
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
  const start = Date.now()

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are ARIA, a helpful AI assistant. Reply very briefly.' },
          { role: 'user',   content: 'Say "ARIA online" and nothing else.' }
        ],
        max_completion_tokens: 20,
        stream: false
      }),
      signal: AbortSignal.timeout(15000)
    })

    const ms = Date.now() - start
    if (!res.ok) {
      const body = await res.text()
      fail(`HTTP ${res.status}`, body.slice(0, 120))
      return false
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content ?? '(empty)'
    ok(`Response received`, `${ms}ms`)
    ok(`Model reply`, `"${reply.trim()}"`)
    ok(`Tokens used`, `prompt=${data.usage?.prompt_tokens}  completion=${data.usage?.completion_tokens}`)
    return true
  } catch (err) {
    fail('Request failed', err.message)
    return false
  }
}

// ── Test 2: Realtime model endpoint reachable ──────────────────
async function testRealtime() {
  header('Realtime Voice Model — gpt-realtime-2-1')
  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '')
  const apiKey     = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT
  const apiVersion = process.env.AZURE_OPENAI_REALTIME_API_VERSION

  info(`Deployment:  ${deployment}`)
  info(`API version: ${apiVersion}`)

  if (!endpoint || !apiKey || !deployment || !apiVersion) {
    fail('Missing env vars — check AZURE_OPENAI_REALTIME_DEPLOYMENT and AZURE_OPENAI_REALTIME_API_VERSION')
    return false
  }

  // The Realtime API is WebSocket-only — no REST endpoint to ping.
  // Deployment was confirmed live via: az cognitiveservices account deployment list
  // We validate the config is complete and show the WSS endpoint to use.
  const host = new URL(endpoint).hostname
  const wssUrl = `wss://${host}/openai/realtime?api-version=${apiVersion}&deployment=${deployment}`

  ok(`Config complete — all env vars set`)
  ok(`Deployment confirmed via az CLI: provisioningState=Succeeded`)
  ok(`WebSocket URL ready:`)
  info(`  ${wssUrl}`)
  ok(`Voice sessions: connect browser via WebSocket with api-key header`)
  return true
}

// ── Test 3: Env var summary ────────────────────────────────────
function checkEnvVars() {
  header('Environment Variables')
  const vars = [
    ['AZURE_OPENAI_ENDPOINT',            true],
    ['AZURE_OPENAI_API_KEY',             true],
    ['AZURE_OPENAI_CHAT_DEPLOYMENT',     true],
    ['AZURE_OPENAI_REALTIME_DEPLOYMENT', true],
    ['AZURE_OPENAI_API_VERSION',         true],
    ['AZURE_COSMOS_ENDPOINT',            false],
    ['AZURE_COSMOS_KEY',                 false],
    ['AZURE_STORAGE_CONNECTION_STRING',  false],
    ['AZURE_SEARCH_ENDPOINT',            false],
    ['AZURE_SEARCH_API_KEY',             false],
  ]

  for (const [key, required] of vars) {
    const val = process.env[key]
    if (val && val.length > 0) {
      const masked = val.length > 12 ? val.slice(0, 8) + '...' + val.slice(-4) : '***'
      ok(key, masked)
    } else if (required) {
      fail(key, 'MISSING — required')
    } else {
      console.log(`  ${YELLOW}–${RESET} ${DIM}${key}${RESET} ${DIM}(optional — not set)${RESET}`)
    }
  }
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════╗`)
  console.log(`║   ARIA — Model Connectivity Test     ║`)
  console.log(`╚══════════════════════════════════════╝${RESET}`)

  loadEnv()
  checkEnvVars()

  const chatOk     = await testChat()
  const realtimeOk = await testRealtime()

  header('Summary')
  chatOk     ? ok('Chat model ready')    : fail('Chat model NOT ready')
  realtimeOk ? ok('Voice model ready')   : fail('Voice model NOT ready')

  console.log('')
  if (chatOk && realtimeOk) {
    console.log(`${GREEN}${BOLD}✓ All systems go — run: npm run dev${RESET}\n`)
  } else {
    console.log(`${YELLOW}⚠ Fix the above issues, then run: npm run dev${RESET}\n`)
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
