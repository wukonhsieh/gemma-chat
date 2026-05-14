import { createHash } from 'crypto'
import { readdir, readFile, writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import type { SkillFrontmatter, SkillMetadata, SkillsLockFile } from './types'

function parseFrontmatter(content: string): { data: Partial<SkillFrontmatter>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: content }

  const raw = match[1]
  const body = match[2]
  const data: Partial<SkillFrontmatter> = {}
  let currentKey: string | null = null
  let currentArray: string[] | null = null

  for (const line of raw.split('\n')) {
    const arrayItem = line.match(/^[ \t]+-[ \t]+(.+)$/)
    if (arrayItem && currentArray !== null) {
      currentArray.push(arrayItem[1].trim())
      continue
    }

    const keyValue = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (!keyValue) continue

    currentKey = keyValue[1]
    currentArray = null
    const val = keyValue[2].trim()

    if (val === '' || val === null) {
      currentArray = []
      ;(data as Record<string, unknown>)[currentKey] = currentArray
    } else if (val === 'true') {
      ;(data as Record<string, unknown>)[currentKey] = true
    } else if (val === 'false') {
      ;(data as Record<string, unknown>)[currentKey] = false
    } else {
      ;(data as Record<string, unknown>)[currentKey] = val
    }
  }

  return { data, body }
}

function sha256(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function loadLockFile(lockPath: string): Promise<SkillsLockFile | null> {
  if (!(await exists(lockPath))) return null
  try {
    const raw = await readFile(lockPath, 'utf-8')
    return JSON.parse(raw) as SkillsLockFile
  } catch {
    return null
  }
}

export async function scanSkills(projectRoot: string): Promise<SkillsLockFile> {
  const skillsRoot = join(projectRoot, '.agents', 'skills')
  const cacheDir = join(projectRoot, '.agents', 'cache')
  const lockPath = join(cacheDir, 'skills.lock.json')

  const cached = await loadLockFile(lockPath)
  const existingSkills: Record<string, SkillMetadata> = cached?.skills ?? {}
  const updatedSkills: Record<string, SkillMetadata> = {}

  if (!(await exists(skillsRoot))) {
    const lock: SkillsLockFile = { version: 1, generatedAt: new Date().toISOString(), skills: {} }
    await mkdir(cacheDir, { recursive: true })
    await writeFile(lockPath, JSON.stringify(lock, null, 2), 'utf-8')
    return lock
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const skillMdPath = join(skillsRoot, entry.name, 'SKILL.md')
    if (!(await exists(skillMdPath))) continue

    const content = await readFile(skillMdPath, 'utf-8')
    const hash = sha256(content)
    const { data } = parseFrontmatter(content)
    const name = data.name ?? entry.name
    const existing = existingSkills[name]

    if (existing && existing.sourceHash === hash) {
      updatedSkills[name] = existing
      continue
    }

    const description = data.description ?? ''
    const summary = data.summary ?? description

    updatedSkills[name] = {
      name,
      description,
      summary,
      userInvocable: data['user-invocable'] !== false,
      modelInvocable: data['disable-model-invocation'] !== true,
      risk: data.risk ?? 'low',
      triggers: data.triggers ?? [],
      type: data.type ?? 'unknown',
      scope: 'project',
      path: skillMdPath,
      sourceHash: hash
    }
  }

  const lock: SkillsLockFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    skills: updatedSkills
  }

  await mkdir(cacheDir, { recursive: true })
  await writeFile(lockPath, JSON.stringify(lock, null, 2), 'utf-8')
  return lock
}
