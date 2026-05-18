import { describe, test, expect, beforeEach } from 'vitest'
import { mkdtemp, readFile, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  loadChatStateFromDisk,
  normalizeChatState,
  saveChatStateToDisk
} from '../../src/main/conversations'
import type { ChatState } from '../../src/shared/types'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'gabie-conv-'))
  return async () => {
    await rm(dir, { recursive: true, force: true })
  }
})

const sample: ChatState = {
  conversations: [
    {
      id: 'c_1',
      title: 'first',
      messages: [
        { id: 'm_1', role: 'user', content: 'hi', createdAt: 100 },
        { id: 'm_2', role: 'assistant', content: 'hello', createdAt: 101 }
      ],
      createdAt: 100,
      updatedAt: 101,
      mode: 'code',
      canvasOpen: true,
      projectId: 'p_1',
      projectPath: '/tmp/p'
    }
  ],
  projects: [
    { id: 'p_1', path: '/tmp/p', name: 'p', createdAt: 100, lastActivityAt: 101 }
  ],
  activeProjectId: 'p_1'
}

describe('saveChatStateToDisk + loadChatStateFromDisk', () => {
  test('returns empty state when file does not exist', async () => {
    const loaded = await loadChatStateFromDisk(dir)
    expect(loaded.conversations).toEqual([])
    expect(loaded.projects).toEqual([])
    expect(loaded.activeProjectId).toBeNull()
  })

  test('round-trips a populated state', async () => {
    await saveChatStateToDisk(dir, sample)
    const loaded = await loadChatStateFromDisk(dir)
    expect(loaded).toEqual(sample)
  })

  test('returns empty state when file is corrupt JSON', async () => {
    await writeFile(join(dir, 'chat-state.json'), '{not valid', 'utf-8')
    const loaded = await loadChatStateFromDisk(dir)
    expect(loaded.conversations).toEqual([])
    expect(loaded.activeProjectId).toBeNull()
  })

  test('atomic write: temp file is gone after a successful save', async () => {
    await saveChatStateToDisk(dir, sample)
    await expect(readFile(join(dir, 'chat-state.json.tmp'))).rejects.toThrow()
  })

  test('overwriting state with fewer conversations does not retain old data', async () => {
    await saveChatStateToDisk(dir, sample)
    const reduced: ChatState = { conversations: [], projects: [], activeProjectId: null }
    await saveChatStateToDisk(dir, reduced)
    const loaded = await loadChatStateFromDisk(dir)
    expect(loaded.conversations).toEqual([])
  })
})

describe('normalizeChatState', () => {
  test('returns empty state for null / non-object input', () => {
    expect(normalizeChatState(null).conversations).toEqual([])
    expect(normalizeChatState(undefined).conversations).toEqual([])
    expect(normalizeChatState('garbage').conversations).toEqual([])
    expect(normalizeChatState(42).conversations).toEqual([])
  })

  test('preserves valid conversations and projects', () => {
    const out = normalizeChatState(sample)
    expect(out.conversations.length).toBe(1)
    expect(out.conversations[0].id).toBe('c_1')
    expect(out.projects.length).toBe(1)
    expect(out.activeProjectId).toBe('p_1')
  })

  test('drops projects without id or path', () => {
    const out = normalizeChatState({
      conversations: [],
      projects: [{ id: 'ok', path: '/a', name: 'a' }, { name: 'broken' }, null],
      activeProjectId: null
    })
    expect(out.projects.length).toBe(1)
    expect(out.projects[0].id).toBe('ok')
  })

  test('clears activeProjectId that points to a missing project', () => {
    const out = normalizeChatState({
      conversations: [],
      projects: [],
      activeProjectId: 'ghost'
    })
    expect(out.activeProjectId).toBeNull()
  })

  test('preserves messages including persisted skill injection content', () => {
    const injected = '[SKILL ACTIVATED: gen-pptx]\nbody\n\n---\n\nmake slides'
    const out = normalizeChatState({
      conversations: [
        {
          id: 'c',
          title: 't',
          messages: [{ id: 'm', role: 'user', content: injected, createdAt: 1 }],
          createdAt: 1,
          updatedAt: 1,
          mode: 'code'
        }
      ],
      projects: [],
      activeProjectId: null
    })
    expect(out.conversations[0].messages[0].content).toBe(injected)
  })
})

describe('legacy migration shape', () => {
  test('legacy ChatState from localStorage normalizes into fs form', async () => {
    // Simulate the legacy localStorage JSON payload format. The renderer
    // forwards this verbatim to main; main runs it through normalizeChatState
    // before saving.
    const legacy = JSON.stringify(sample)
    const parsed = JSON.parse(legacy)
    const normalized = normalizeChatState(parsed)
    await saveChatStateToDisk(dir, normalized)
    const reloaded = await loadChatStateFromDisk(dir)
    expect(reloaded.conversations[0].messages.length).toBe(2)
    expect(reloaded.projects[0].path).toBe('/tmp/p')
  })

  test('migration is idempotent: existing fs state is not overwritten', async () => {
    await saveChatStateToDisk(dir, sample)
    // Caller (main IPC handler) should check fs first; here we mimic
    // the guard: if fs has data, skip migration.
    const existing = await loadChatStateFromDisk(dir)
    expect(existing.conversations.length).toBe(1)
    // Simulating "do not overwrite" — we don't call save again.
    const reloaded = await loadChatStateFromDisk(dir)
    expect(reloaded).toEqual(sample)
  })
})
