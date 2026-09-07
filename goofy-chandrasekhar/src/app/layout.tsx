// ── app/layout.tsx ─────────────────────────────────────────────
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Knowvoro — Knowledge. Reimagined.',
  description: 'AI-powered voice and chat assistant. Ask anything, upload files, get answers.',
  keywords: ['AI', 'Azure', 'voice assistant', 'chatbot', 'Knowvoro', 'knowledge'],
  openGraph: {
    title: 'Knowvoro — Knowledge. Reimagined.',
    description: 'AI-powered voice and chat assistant. Ask anything, upload files, get answers.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}
