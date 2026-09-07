// ── lib/cosmos-client.ts ──────────────────────────────────────
// Azure Cosmos DB — session memory storage.
// All DB access goes through this module (server-side only).

import { CosmosClient, Container } from '@azure/cosmos'
import { config } from './config'
import type { Session, Message } from '@/types'

let _client: CosmosClient | null = null
let _container: Container | null = null

function getContainer(): Container {
  if (!_container) {
    _client = new CosmosClient({ endpoint: config.cosmos.endpoint, key: config.cosmos.key })
    _container = _client
      .database(config.cosmos.database)
      .container(config.cosmos.container)
  }
  return _container
}

export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const { resource } = await getContainer().item(sessionId, sessionId).read<Session>()
    return resource ?? null
  } catch {
    return null
  }
}

export async function createSession(sessionId: string): Promise<Session> {
  const session: Session = {
    id: sessionId,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await getContainer().items.create(session)
  return session
}

export async function upsertSession(session: Session): Promise<void> {
  session.updatedAt = new Date()
  await getContainer().items.upsert(session)
}

export async function appendMessage(sessionId: string, message: Message): Promise<Session> {
  let session = await getSession(sessionId)
  if (!session) session = await createSession(sessionId)

  session.messages.push(message)
  session.updatedAt = new Date()

  // Rolling window: keep last 40 messages to stay within token limits
  if (session.messages.length > 40) {
    session.messages = session.messages.slice(-40)
  }

  await upsertSession(session)
  return session
}

export async function getMessageHistory(sessionId: string): Promise<Message[]> {
  const session = await getSession(sessionId)
  return session?.messages ?? []
}
