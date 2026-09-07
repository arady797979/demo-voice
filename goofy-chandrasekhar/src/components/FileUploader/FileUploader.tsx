'use client'
// ── components/FileUploader/FileUploader.tsx ──────────────────
// Drag-and-drop file upload panel. Pure UI — calls callbacks only.

import { useRef } from 'react'
import type { Attachment } from '@/types'
import styles from './FileUploader.module.css'
import clsx from 'clsx'

const ACCEPTED = '.pdf,.docx,.doc,.txt,.md,.pptx,.xlsx,.jpg,.jpeg,.png,.webp'
const MAX_MB = 50

interface FileUploaderProps {
  attachments: Attachment[]
  isDragging: boolean
  onFiles: (files: FileList | File[]) => void
  onRemove: (id: string) => void
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string }) {
  if (type.includes('pdf'))   return <span className={styles.fileIcon} data-type="pdf">PDF</span>
  if (type.includes('image')) return <span className={styles.fileIcon} data-type="img">IMG</span>
  if (type.includes('word') || type.includes('doc')) return <span className={styles.fileIcon} data-type="doc">DOC</span>
  return <span className={styles.fileIcon} data-type="txt">TXT</span>
}

export function FileUploader({ attachments, isDragging, onFiles, onRemove, dragHandlers }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={styles.wrapper}>
      {/* Drop zone */}
      <div
        className={clsx(styles.dropzone, isDragging && styles.dragging)}
        {...dragHandlers}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        id="file-dropzone"
        aria-label="Drop files or click to upload"
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className={styles.hiddenInput}
          onChange={e => e.target.files && onFiles(e.target.files)}
        />
        <div className={styles.dropContent}>
          <div className={clsx(styles.dropIcon, isDragging && styles.dropIconActive)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className={styles.dropText}>
            {isDragging ? 'Drop files here' : 'Drag files here or click to browse'}
          </p>
          <p className={styles.dropHint}>PDF, Word, TXT, images — up to {MAX_MB} MB</p>
        </div>
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <ul className={styles.list}>
          {attachments.map(att => (
            <li key={att.id} className={styles.item}>
              <FileIcon type={att.type} />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{att.name}</span>
                <span className={styles.itemMeta}>{formatSize(att.size)}</span>
              </div>

              {/* Progress / status */}
              <div className={styles.itemStatus}>
                {att.status === 'uploading' && (
                  <>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${att.progress ?? 0}%` }} />
                    </div>
                    <span className={styles.statusText}>{att.progress ?? 0}%</span>
                  </>
                )}
                {att.status === 'processing' && (
                  <span className={clsx(styles.statusBadge, styles.processing)}>Indexing…</span>
                )}
                {att.status === 'ready' && (
                  <span className={clsx(styles.statusBadge, styles.ready)}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Ready
                  </span>
                )}
                {att.status === 'error' && (
                  <span className={clsx(styles.statusBadge, styles.error)}>Error</span>
                )}
              </div>

              {/* Remove */}
              <button
                className={styles.removeBtn}
                onClick={() => onRemove(att.id)}
                aria-label={`Remove ${att.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6"  y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
