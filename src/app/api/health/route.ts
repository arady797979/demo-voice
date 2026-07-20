// ── app/api/health/route.ts ──────────────────────────────────
// Health check endpoint — verifies connectivity to all Azure services.
// Hit GET /api/health to see what's working and what's not.

import { NextResponse } from 'next/server'
import { CosmosClient } from '@azure/cosmos'
import { BlobServiceClient } from '@azure/storage-blob'
import { config } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ServiceStatus {
  name: string
  status: 'ok' | 'error' | 'not_configured'
  latencyMs?: number
  message?: string
}

async function checkService(
  name: string,
  testFn: () => Promise<void>
): Promise<ServiceStatus> {
  const configuredCheck: Record<string, () => boolean> = {
    'Azure OpenAI': () => !!config.openai.endpoint && !!config.openai.apiKey,
    'Azure Cosmos DB': () => !!config.cosmos.endpoint && !!config.cosmos.key,
    'Azure Blob Storage': () => !!config.storage.connectionString,
    'Azure AI Search': () => !!config.search.endpoint && !!config.search.apiKey,
    'Azure Document Intelligence': () => !!config.docIntelligence.endpoint && !!config.docIntelligence.key,
  }

  const isConfigured = configuredCheck[name]?.() ?? true
  if (!isConfigured) {
    return { name, status: 'not_configured', message: 'Missing env vars' }
  }

  const start = Date.now()
  try {
    await testFn()
    return { name, status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    return {
      name,
      status: 'error',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function GET() {
  const startTime = Date.now()

  const services = await Promise.all([
    // 1. Azure OpenAI — quick models list ping
    checkService('Azure OpenAI', async () => {
      const url = `${config.openai.endpoint}openai/models?api-version=${config.openai.apiVersion}`
      const res = await fetch(url, {
        headers: { 'api-key': config.openai.apiKey },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }),

    // 2. Cosmos DB — attempt to read database metadata
    checkService('Azure Cosmos DB', async () => {
      const client = new CosmosClient({ endpoint: config.cosmos.endpoint, key: config.cosmos.key })
      await client.getDatabaseAccount()
    }),

    // 3. Blob Storage — list containers
    checkService('Azure Blob Storage', async () => {
      const client = BlobServiceClient.fromConnectionString(config.storage.connectionString)
      await client.getProperties()
    }),

    // 4. AI Search — ping the service
    checkService('Azure AI Search', async () => {
      const res = await fetch(`${config.search.endpoint}/indexes?api-version=2024-07-01`, {
        headers: { 'api-key': config.search.apiKey },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }),

    // 5. Document Intelligence — ping
    checkService('Azure Document Intelligence', async () => {
      const res = await fetch(`${config.docIntelligence.endpoint}formrecognizer/info?api-version=2023-07-31`, {
        headers: { 'Ocp-Apim-Subscription-Key': config.docIntelligence.key },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }),
  ])

  const allOk = services.every(s => s.status === 'ok')
  const configured = services.filter(s => s.status !== 'not_configured')
  const healthy = configured.filter(s => s.status === 'ok')

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    totalLatencyMs: Date.now() - startTime,
    summary: `${healthy.length}/${configured.length} services online`,
    services,
    config: {
      chatDeployment: config.openai.chatDeployment,
      realtimeDeployment: config.openai.realtimeDeployment,
      cosmosDatabase: config.cosmos.database,
      searchIndex: config.search.indexName,
      storageContainer: config.storage.containerName,
    },
  })
}
