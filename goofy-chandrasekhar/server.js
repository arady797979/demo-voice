// ── server.js ──────────────────────────────────────────────────
// Custom Next.js server with WebSocket proxy for Azure OpenAI Realtime.
// The browser connects to ws://localhost:3000/ws/realtime (same origin, no credentials clash).
// This server proxies to Azure with the api-key injected server-side only.
// Run with: node server.js  (replaces `next dev`)

'use strict'

const fs   = require('fs')
const path = require('path')

// Parse .env manually (dotenv not required)
try {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
  }
} catch { /* no .env file, use existing process.env */ }

const http    = require('http')
const { parse } = require('url')
const next    = require('next')
const { WebSocket, WebSocketServer } = require('ws')

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app  = next({ dev })
const handle = app.getRequestHandler()

// ── Azure config ───────────────────────────────────────────────
const AZURE_ENDPOINT   = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '')
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-realtime-2-1'
const AZURE_API_VER    = process.env.AZURE_OPENAI_REALTIME_API_VERSION || '2025-04-01-preview'
const AZURE_KEY        = process.env.AZURE_OPENAI_API_KEY || ''

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  })

  // ── WebSocket proxy ──────────────────────────────────────────
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url)

    if (pathname !== '/ws/realtime') {
      socket.destroy()
      return
    }

    const azureWssUrl =
      `${AZURE_ENDPOINT.replace('https://', 'wss://')}/openai/realtime` +
      `?api-version=${AZURE_API_VER}` +
      `&deployment=${AZURE_DEPLOYMENT}` +
      `&api-key=${AZURE_KEY}`

    console.log(`[ws-proxy] Client connected → proxying to Azure (${AZURE_DEPLOYMENT})`)

    // Connect to Azure from the server (no browser credentials involved)
    const azureWs = new WebSocket(azureWssUrl)

    azureWs.once('open', () => {
      console.log('[ws-proxy] Azure WS opened ✓')

      // Now upgrade the browser connection
      const wss = new WebSocketServer({ noServer: true })
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        console.log('[ws-proxy] Browser WS upgraded ✓')

        // ── Bidirectional pipe ─────────────────────────────────
        clientWs.on('message', (data, isBinary) => {
          if (azureWs.readyState === WebSocket.OPEN) {
            azureWs.send(data, { binary: isBinary })
          }
        })

        azureWs.on('message', (data, isBinary) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            // Log key messages server-side for debugging
            if (!isBinary) {
              try {
                const msg = JSON.parse(data.toString())
                // Skip non-critical cancel noise
                if (msg.type === 'error' && msg.error?.code === 'response_cancel_not_active') {
                  // suppress
                } else if (['error', 'session.created', 'session.updated', 'response.done'].includes(msg.type)) {
                  console.log(`[ws-proxy] Azure → client: ${msg.type}`,
                    msg.type === 'error' ? JSON.stringify(msg.error) : '')
                }
              } catch { /* binary or unparseable */ }
            }
            clientWs.send(data, { binary: isBinary })
          }
        })

        clientWs.on('close', (code, reason) => {
          console.log(`[ws-proxy] Browser closed: ${code} ${reason}`)
          if (azureWs.readyState === WebSocket.OPEN) azureWs.close(code)
        })

        azureWs.on('close', (code, reason) => {
          console.log(`[ws-proxy] Azure closed: ${code} ${reason.toString()}`)
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code)
        })

        clientWs.on('error', (err) => console.error('[ws-proxy] Client error:', err.message))
        azureWs.on('error', (err) => console.error('[ws-proxy] Azure error:', err.message))
      })
    })

    azureWs.on('error', (err) => {
      console.error('[ws-proxy] Failed to connect to Azure:', err.message)
      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n')
      socket.destroy()
    })
  })

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? 'dev' : 'prod'})`)
    console.log(`> WS proxy: ws://localhost:${port}/ws/realtime → ${AZURE_DEPLOYMENT}`)
  })
})
