// ── hooks/useFileUpload.ts ───────────────────────────────────
// Handles file selection, SAS token fetch, and browser → Blob upload.
// Decoupled from all UI and chat concerns.

'use client'
import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Attachment } from '@/types'

interface UseFileUploadOptions {
  sessionId: string
  onAttachmentReady?: (attachment: Attachment) => void
}

export function useFileUpload({ sessionId, onAttachmentReady }: UseFileUploadOptions) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isDragging,  setIsDragging]  = useState(false)

  const updateAttachment = (id: string, update: Partial<Attachment>) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, ...update } : a))
  }

  const uploadFile = useCallback(async (file: File) => {
    const id = uuidv4()
    const attachment: Attachment = {
      id, name: file.name, size: file.size, type: file.type,
      url: '', status: 'uploading', progress: 0,
    }
    setAttachments(prev => [...prev, attachment])

    try {
      // 1. Get SAS URL from backend
      const sasRes = await fetch('/api/upload-sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fileName: file.name, fileType: file.type }),
      })
      if (!sasRes.ok) throw new Error('Failed to get upload URL')
      const { sasUrl, blobUrl } = await sasRes.json() as { sasUrl: string; blobUrl: string }

      // 2. Upload directly to Azure Blob Storage via SAS URL
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateAttachment(id, { progress: Math.round((e.loaded / e.total) * 90) })
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.open('PUT', sasUrl)
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      // 3. Notify backend to index the document
      await fetch('/api/index-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, blobUrl, fileName: file.name }),
      })

      const ready: Attachment = { ...attachment, url: blobUrl, status: 'ready', progress: 100 }
      updateAttachment(id, { url: blobUrl, status: 'ready', progress: 100 })
      onAttachmentReady?.(ready)

    } catch (err) {
      updateAttachment(id, { status: 'error' })
      console.error('Upload error:', err)
    }
  }, [sessionId, onAttachmentReady])

  const uploadFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(f => uploadFile(f))
  }, [uploadFile])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  const clearAttachments = useCallback(() => setAttachments([]), [])

  // Drag handlers
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = ()                      => setIsDragging(false)
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }

  return {
    attachments, isDragging,
    uploadFiles, removeAttachment, clearAttachments,
    dragHandlers: { onDragOver, onDragLeave, onDrop },
  }
}
