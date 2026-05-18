import { mkdir, readFile, writeFile, rename } from 'fs/promises'
import { dirname, join } from 'path'
import type { ChatState, Conversation, ProjectRecord } from '../shared/types'

const FILE_NAME = 'chat-state.json'
const TMP_SUFFIX = '.tmp'

function emptyChatState(): ChatState {
  return { conversations: [], projects: [], activeProjectId: null }
}

function chatStatePath(userDataDir: string): string {
  return join(userDataDir, FILE_NAME)
}

function normalizeProjects(value: unknown): ProjectRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((p): p is Partial<ProjectRecord> => !!p && typeof p === 'object')
    .filter((p) => typeof p.id === 'string' && typeof p.path === 'string')
    .map((p) => ({
      id: p.id!,
      path: p.path!,
      name:
        typeof p.name === 'string' && p.name
          ? p.name
          : (p.path!.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p.path!),
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      lastActivityAt:
        typeof p.lastActivityAt === 'number'
          ? p.lastActivityAt
          : typeof p.createdAt === 'number'
            ? p.createdAt
            : Date.now()
    }))
}

function normalizeConversations(value: unknown): Conversation[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((c): c is Partial<Conversation> => !!c && typeof c === 'object')
    .map((c) => ({
      id: typeof c.id === 'string' ? c.id : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: typeof c.title === 'string' ? c.title : 'New chat',
      messages: Array.isArray(c.messages) ? c.messages : [],
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
      updatedAt:
        typeof c.updatedAt === 'number'
          ? c.updatedAt
          : typeof c.createdAt === 'number'
            ? c.createdAt
            : Date.now(),
      mode: c.mode ?? 'code',
      canvasOpen: c.canvasOpen ?? c.mode === 'code',
      projectId: typeof c.projectId === 'string' ? c.projectId : undefined,
      projectPath: typeof c.projectPath === 'string' ? c.projectPath : undefined
    }))
}

export function normalizeChatState(value: unknown): ChatState {
  if (!value || typeof value !== 'object') return emptyChatState()
  const parsed = value as Partial<ChatState>
  const projects = normalizeProjects(parsed.projects)
  const conversations = normalizeConversations(parsed.conversations)
  const activeProjectId =
    typeof parsed.activeProjectId === 'string' &&
    projects.some((p) => p.id === parsed.activeProjectId)
      ? parsed.activeProjectId
      : projects[0]?.id ?? null
  return { conversations, projects, activeProjectId }
}

export async function loadChatStateFromDisk(userDataDir: string): Promise<ChatState> {
  const path = chatStatePath(userDataDir)
  let raw: string
  try {
    raw = await readFile(path, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyChatState()
    throw err
  }
  try {
    return normalizeChatState(JSON.parse(raw))
  } catch {
    return emptyChatState()
  }
}

// Atomic write: write to <path>.tmp then rename. Avoids torn writes on
// crash mid-save.
export async function saveChatStateToDisk(
  userDataDir: string,
  state: ChatState
): Promise<void> {
  const path = chatStatePath(userDataDir)
  await mkdir(dirname(path), { recursive: true })
  const tmp = path + TMP_SUFFIX
  await writeFile(tmp, JSON.stringify(state), 'utf-8')
  await rename(tmp, path)
}
