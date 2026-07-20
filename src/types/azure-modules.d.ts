// ── types/azure-modules.d.ts ──────────────────────────────────
// Type declarations for Azure SDK packages that ship ESM
// without co-located .d.ts files in some versions.

declare module '@azure/cosmos' {
  export class CosmosClient {
    constructor(options: { endpoint: string; key: string })
    database(id: string): DatabaseReference
    getDatabaseAccount(): Promise<unknown>
  }
  interface DatabaseReference {
    container(id: string): ContainerReference
  }
  interface ContainerReference {
    items: Items
    item(id: string, partitionKey: string): ItemReference
  }
  interface Items {
    create<T>(body: T): Promise<{ resource: T }>
    upsert<T>(body: T): Promise<{ resource: T }>
  }
  interface ItemReference {
    read<T>(): Promise<{ resource: T | undefined }>
  }
  export type Container = ContainerReference
}

declare module '@azure/storage-blob' {
  export class BlobServiceClient {
    static fromConnectionString(connStr: string): BlobServiceClient
    getProperties(): Promise<unknown>
  }
  export class StorageSharedKeyCredential {
    constructor(accountName: string, accountKey: string)
  }
  export class BlobSASPermissions {
    static parse(permissions: string): BlobSASPermissions
  }
  export function generateBlobSASQueryParameters(
    options: {
      containerName: string
      blobName: string
      permissions: BlobSASPermissions
      startsOn: Date
      expiresOn: Date
      contentType?: string
    },
    credential: StorageSharedKeyCredential
  ): { toString(): string }
}

declare module '@azure/search-documents' {
  export class AzureKeyCredential {
    constructor(key: string)
  }
  export class SearchClient<T> {
    constructor(endpoint: string, indexName: string, credential: AzureKeyCredential)
    search(query: string, options?: {
      filter?: string
      top?: number
      select?: string[]
    }): Promise<{ results: AsyncIterable<{ document: T }> }>
    uploadDocuments(docs: T[]): Promise<unknown>
  }
  export class SearchIndexClient {
    constructor(endpoint: string, credential: AzureKeyCredential)
    getIndex(name: string): Promise<unknown>
    createIndex(definition: {
      name: string
      fields: Array<{
        name: string
        type: string
        key?: boolean
        searchable?: boolean
        filterable?: boolean
        sortable?: boolean
        retrievable?: boolean
      }>
    }): Promise<unknown>
  }
}

declare module '@azure/ai-form-recognizer' {
  export class DocumentAnalysisClient {
    constructor(endpoint: string, credential: unknown)
    beginAnalyzeDocument(modelId: string, input: unknown): Promise<unknown>
  }
}
