// ── lib/logger.ts ─────────────────────────────────────────────
// Structured debug logger. Shows request flow, timings, errors.
// Set LOG_LEVEL=debug in .env for verbose output.

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '\x1b[36m',  // cyan
  info:  '\x1b[32m',  // green
  warn:  '\x1b[33m',  // yellow
  error: '\x1b[31m',  // red
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ?? 'debug'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 23) // HH:mm:ss.SSS
}

function log(level: LogLevel, scope: string, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return

  const color = LEVEL_COLOR[level]
  const tag = level.toUpperCase().padEnd(5)
  const prefix = `${DIM}${formatTimestamp()}${RESET} ${color}${tag}${RESET} ${BOLD}[${scope}]${RESET}`

  if (data) {
    const compact = JSON.stringify(data, null, 0)
    if (compact.length < 200) {
      console.log(`${prefix} ${message} ${DIM}${compact}${RESET}`)
    } else {
      console.log(`${prefix} ${message}`)
      console.log(JSON.stringify(data, null, 2))
    }
  } else {
    console.log(`${prefix} ${message}`)
  }
}

/** Create a scoped logger for a specific module or API route */
export function createLogger(scope: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) => log('debug', scope, msg, data),
    info:  (msg: string, data?: Record<string, unknown>) => log('info',  scope, msg, data),
    warn:  (msg: string, data?: Record<string, unknown>) => log('warn',  scope, msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log('error', scope, msg, data),

    /** Time an async operation and log the result */
    async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const start = performance.now()
      try {
        const result = await fn()
        const ms = (performance.now() - start).toFixed(1)
        log('debug', scope, `${label} ${DIM}(${ms}ms)${RESET}`)
        return result
      } catch (err) {
        const ms = (performance.now() - start).toFixed(1)
        log('error', scope, `${label} FAILED ${DIM}(${ms}ms)${RESET}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },

    /** Log an incoming request */
    request(method: string, path: string, body?: unknown) {
      log('info', scope, `→ ${method} ${path}`, body ? { body: body as Record<string, unknown> } : undefined)
    },

    /** Log an outgoing response */
    response(status: number, meta?: Record<string, unknown>) {
      const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
      log(level, scope, `← ${status}`, meta)
    },
  }
}

// Pre-built loggers for common modules
export const chatLog    = createLogger('api/chat')
export const voiceLog   = createLogger('api/voice')
export const uploadLog  = createLogger('api/upload')
export const indexLog   = createLogger('api/index')
export const searchLog  = createLogger('lib/search')
export const cosmosLog  = createLogger('lib/cosmos')
export const healthLog  = createLogger('api/health')
