import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import os from 'os'
import { registerConversationWorkspace } from '../../src/main/workspace'

export interface TestWorkspace {
  id: string
  dir: string
  cleanup: () => Promise<void>
}

export async function createTestWorkspace(label: string): Promise<TestWorkspace> {
  const id = `sec-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const dir = await mkdtemp(join(os.tmpdir(), `gemma-sec-`))
  registerConversationWorkspace(id, dir)
  return {
    id,
    dir,
    cleanup: async () => {
      registerConversationWorkspace(id, undefined)
      await rm(dir, { recursive: true, force: true })
    }
  }
}

export function llmAvailable(): boolean {
  return !!process.env.LLM_URL
}

export function llmUrl(): string {
  return process.env.LLM_URL ?? 'http://127.0.0.1:10240/v1'
}

export function llmModel(): string {
  return process.env.LLM_MODEL ?? 'gemma'
}

export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 512
): Promise<string> {
  const res = await fetch(`${llmUrl()}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: llmModel(),
      messages,
      max_tokens: maxTokens,
      temperature: 0.0
    })
  })
  if (!res.ok) {
    throw new Error(`LLM request failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}
