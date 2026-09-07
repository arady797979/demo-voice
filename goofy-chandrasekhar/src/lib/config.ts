// ── lib/config.ts ─────────────────────────────────────────────
// Central config — reads env vars once, typed, validated.
// Import this anywhere instead of process.env directly.

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const config = {
  openai: {
    endpoint:            requireEnv('AZURE_OPENAI_ENDPOINT'),
    apiKey:              requireEnv('AZURE_OPENAI_API_KEY'),
    apiVersion:          optionalEnv('AZURE_OPENAI_API_VERSION', '2025-01-01-preview'),
    realtimeApiVersion:  optionalEnv('AZURE_OPENAI_REALTIME_API_VERSION', '2025-04-01-preview'),
    chatDeployment:      optionalEnv('AZURE_OPENAI_CHAT_DEPLOYMENT', 'aria-chat'),
    realtimeDeployment:  optionalEnv('AZURE_OPENAI_REALTIME_DEPLOYMENT', 'gpt-realtime-2-1'),
  },
  storage: {
    accountName:     optionalEnv('AZURE_STORAGE_ACCOUNT_NAME'),
    connectionString: optionalEnv('AZURE_STORAGE_CONNECTION_STRING'),
    containerName:   optionalEnv('AZURE_STORAGE_CONTAINER_NAME', 'agent-uploads'),
  },
  cosmos: {
    endpoint:   optionalEnv('AZURE_COSMOS_ENDPOINT'),
    key:        optionalEnv('AZURE_COSMOS_KEY'),
    database:   optionalEnv('AZURE_COSMOS_DATABASE', 'agent-db'),
    container:  optionalEnv('AZURE_COSMOS_CONTAINER', 'sessions'),
  },
  search: {
    endpoint:  optionalEnv('AZURE_SEARCH_ENDPOINT'),
    apiKey:    optionalEnv('AZURE_SEARCH_API_KEY'),
    indexName: optionalEnv('AZURE_SEARCH_INDEX_NAME', 'agent-docs'),
  },
  docIntelligence: {
    endpoint: optionalEnv('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'),
    key:      optionalEnv('AZURE_DOCUMENT_INTELLIGENCE_KEY'),
  },
}

// ── Realtime WebSocket URL builder ────────────────────────────
export function buildRealtimeWsUrl(ephemeralToken: string): string {
  const base = config.openai.endpoint.replace('https://', 'wss://')
  return `${base}openai/realtime?api-version=${config.openai.realtimeApiVersion}&deployment=${config.openai.realtimeDeployment}&authorization=Bearer ${ephemeralToken}`
}
