// ── lib/search-client.ts ──────────────────────────────────────
// Azure AI Search — RAG document retrieval (server-side only).

import { SearchClient, SearchIndexClient, AzureKeyCredential } from '@azure/search-documents'
import { config } from './config'

interface SearchDocument {
  id: string
  content: string
  filename: string
  sessionId: string
  chunkIndex: number
}

let _searchClient: SearchClient<SearchDocument> | null = null
let _indexClient: SearchIndexClient | null = null

function getSearchClient(): SearchClient<SearchDocument> {
  if (!_searchClient) {
    _searchClient = new SearchClient<SearchDocument>(
      config.search.endpoint,
      config.search.indexName,
      new AzureKeyCredential(config.search.apiKey)
    )
  }
  return _searchClient
}

function getIndexClient(): SearchIndexClient {
  if (!_indexClient) {
    _indexClient = new SearchIndexClient(
      config.search.endpoint,
      new AzureKeyCredential(config.search.apiKey)
    )
  }
  return _indexClient
}

export async function searchDocuments(
  query: string,
  sessionId: string,
  topK = 5
): Promise<string> {
  try {
    const client = getSearchClient()
    const results = await client.search(query, {
      filter: `sessionId eq '${sessionId}'`,
      top: topK,
      select: ['content', 'filename'],
    })

    const chunks: string[] = []
    for await (const result of results.results) {
      chunks.push(`[${result.document.filename}]: ${result.document.content}`)
    }
    return chunks.join('\n\n---\n\n')
  } catch (err) {
    console.error('Search failed:', err)
    return ''
  }
}

export async function indexDocument(
  sessionId: string,
  filename: string,
  chunks: string[]
): Promise<void> {
  const client = getSearchClient()
  const docs: SearchDocument[] = chunks.map((content, i) => ({
    id: `${sessionId}-${filename}-${i}`,
    content,
    filename,
    sessionId,
    chunkIndex: i,
  }))

  await client.uploadDocuments(docs)
}

export async function ensureIndexExists(): Promise<void> {
  try {
    const client = getIndexClient()
    try {
      await client.getIndex(config.search.indexName)
    } catch {
      // Create index if it doesn't exist
      await client.createIndex({
        name: config.search.indexName,
        fields: [
          { name: 'id',         type: 'Edm.String', key: true, filterable: true },
          { name: 'content',    type: 'Edm.String', searchable: true },
          { name: 'filename',   type: 'Edm.String', filterable: true, retrievable: true },
          { name: 'sessionId',  type: 'Edm.String', filterable: true },
          { name: 'chunkIndex', type: 'Edm.Int32',  sortable: true },
        ],
      })
    }
  } catch (err) {
    console.warn('Could not verify search index:', err)
  }
}
