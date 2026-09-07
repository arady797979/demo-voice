// ── app/api/upload-sas/route.ts ──────────────────────────────
// Generates a short-lived SAS URL for browser → Blob direct upload.

import { NextRequest, NextResponse } from 'next/server'
import { StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob'
import { config } from '@/lib/config'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, fileName, fileType } = await req.json()
    if (!sessionId || !fileName) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const accountName = config.storage.accountName
    const connStr     = config.storage.connectionString
    if (!connStr || !accountName) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
    }

    const blobName  = `${sessionId}/${uuidv4()}-${fileName}`
    const expiresOn = new Date(Date.now() + 30 * 60 * 1000) // 30 min

    // Parse connection string to extract key
    const keyMatch  = connStr.match(/AccountKey=([^;]+)/)
    const accountKey = keyMatch?.[1]
    if (!accountKey) throw new Error('Cannot parse storage key')

    const cred = new StorageSharedKeyCredential(accountName, accountKey)
    const sasToken = generateBlobSASQueryParameters({
      containerName: config.storage.containerName,
      blobName,
      permissions: BlobSASPermissions.parse('cw'), // create + write
      startsOn: new Date(),
      expiresOn,
      contentType: fileType,
    }, cred).toString()

    const sasUrl  = `https://${accountName}.blob.core.windows.net/${config.storage.containerName}/${blobName}?${sasToken}`
    const blobUrl = `https://${accountName}.blob.core.windows.net/${config.storage.containerName}/${blobName}`

    return NextResponse.json({ sasUrl, blobUrl, expiresAt: expiresOn.toISOString() })
  } catch (err) {
    console.error('[/api/upload-sas]', err)
    return NextResponse.json({ error: 'Failed to generate SAS URL' }, { status: 500 })
  }
}
