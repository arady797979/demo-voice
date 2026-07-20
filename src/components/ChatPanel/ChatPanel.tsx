'use client'
// ── components/ChatPanel/ChatPanel.tsx ────────────────────────
// Full chat interface — message list, input, attachment tray.

import { useRef, useEffect, useState } from 'react'
import type { Message, Attachment } from '@/types'
import { FileUploader } from '../FileUploader/FileUploader'
import styles from './ChatPanel.module.css'
import clsx from 'clsx'

interface ChatPanelProps {
  messages:       Message[]
  isLoading:      boolean
  error:          string | null
  attachments:    Attachment[]
  isDragging:     boolean
  onSend:         (text: string, attachments: Attachment[]) => void
  onStop:         () => void
  onFiles:        (files: FileList | File[]) => void
  onRemoveFile:   (id: string) => void
  dragHandlers:   { onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void; onDrop: (e: React.DragEvent) => void }
}

// ── Markdown-lite renderer (no external dep needed) ──────────
function renderMarkdown(text: string): string {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupol])/gm, '')
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx(styles.messageRow, isUser ? styles.userRow : styles.assistantRow)}>
      {!isUser && (
        <div className={styles.avatar} aria-label="Knowvoro">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
        </div>
      )}
      <div className={clsx(styles.bubble, isUser ? styles.userBubble : styles.assistantBubble)}>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={styles.attachmentPills}>
            {message.attachments.map(att => (
              <span key={att.id} className={styles.attachmentPill}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {att.name}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <p className={styles.userText}>{message.content}</p>
        ) : (
          <div
            className={styles.assistantText}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}

        {/* Streaming cursor */}
        {message.isStreaming && <span className={styles.streamCursor} aria-hidden />}

        {/* Timestamp */}
        <time className={styles.timestamp} dateTime={message.timestamp.toISOString()}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className={clsx(styles.messageRow, styles.assistantRow)}>
      <div className={styles.avatar} aria-label="Knowvoro typing">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
        </svg>
      </div>
      <div className={clsx(styles.bubble, styles.assistantBubble, styles.typingBubble)}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  )
}

export function ChatPanel({
  messages, isLoading, error, attachments, isDragging,
  onSend, onStop, onFiles, onRemoveFile, dragHandlers,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [showUploader, setShowUploader] = useState(false)
  const listRef    = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const readyFiles = attachments.filter(a => a.status === 'ready')

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`
    }
  }, [input])

  const handleSend = () => {
    if (!input.trim() && readyFiles.length === 0) return
    onSend(input.trim(), readyFiles)
    setInput('')
    setShowUploader(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className={styles.panel} {...dragHandlers}>
      {/* Messages */}
      <div className={styles.messageList} ref={listRef} role="log" aria-live="polite" aria-label="Chat messages">
        {isEmpty && (
          <div className={styles.empty}>
            <div className={styles.emptyOrb} aria-hidden>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>How can I help you today?</h2>
            <p className={styles.emptySubtitle}>Ask anything, upload files, or switch to voice mode.</p>
            <div className={styles.suggestions}>
              {['Summarize a document', 'Write some code', 'Help me think through a problem', 'What can you do?'].map(s => (
                <button key={s} className={styles.suggestion} onClick={() => { setInput(s); inputRef.current?.focus() }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
        {isLoading && messages[messages.length - 1]?.role === 'user' && <TypingIndicator />}

        {/* Drag overlay */}
        {isDragging && (
          <div className={styles.dragOverlay}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>Drop files to attach</p>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Uploader tray */}
      {showUploader && (
        <div className={styles.uploaderTray}>
          <FileUploader
            attachments={attachments}
            isDragging={isDragging}
            onFiles={onFiles}
            onRemove={onRemoveFile}
            dragHandlers={dragHandlers}
          />
        </div>
      )}

      {/* Pending attachment pills */}
      {attachments.length > 0 && !showUploader && (
        <div className={styles.pendingPills}>
          {attachments.map(a => (
            <span key={a.id} className={clsx(styles.pendingPill, styles[a.status])}>
              {a.name.slice(0, 20)}{a.name.length > 20 ? '…' : ''}
              {a.status === 'uploading' && ` ${a.progress ?? 0}%`}
              <button onClick={() => onRemoveFile(a.id)} aria-label={`Remove ${a.name}`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className={styles.inputBar}>
        <button
          id="attach-file-btn"
          className={clsx(styles.iconBtn, showUploader && styles.iconBtnActive)}
          onClick={() => setShowUploader(p => !p)}
          aria-label="Attach files"
          title="Attach files"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          {attachments.length > 0 && <span className={styles.badge}>{attachments.length}</span>}
        </button>

        <textarea
          ref={inputRef}
          id="chat-input"
          className={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Knowvoro… (Shift+Enter for new line)"
          rows={1}
          aria-label="Chat message input"
        />

        {isLoading ? (
          <button id="stop-btn" className={clsx(styles.sendBtn, styles.stopBtn)} onClick={onStop} aria-label="Stop generating">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
            </svg>
          </button>
        ) : (
          <button
            id="send-btn"
            className={clsx(styles.sendBtn, (input.trim() || readyFiles.length > 0) && styles.sendBtnActive)}
            onClick={handleSend}
            disabled={!input.trim() && readyFiles.length === 0}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
