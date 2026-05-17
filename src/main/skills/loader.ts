import { readFile, readdir } from 'fs/promises'
import type { Dirent } from 'fs'
import { dirname, join } from 'path'
import type { SkillIndex, SkillLoadResult } from './types'

export interface LoadedSkillsRegistry {
  [skillName: string]: { sourceHash: string; loadedAtTurn: number }
}

const SKILL_FILE_LIST_MAX_DEPTH = 3
const SKILL_FILE_LIST_MAX_ENTRIES = 50
const SKILL_FILE_LIST_EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '__pycache__',
  'dist',
  'build',
  '.venv',
  'venv',
  '.next',
  '.cache'
])
const SKILL_FILE_LIST_EXCLUDE_EXT = new Set(['.pyc', '.pyo', '.DS_Store'])

async function listSkillFiles(rootDir: string): Promise<{ files: string[]; truncated: number }> {
  const out: string[] = []
  let truncated = 0

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > SKILL_FILE_LIST_MAX_DEPTH) return
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true, encoding: 'utf-8' })
    } catch {
      return
    }
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.well-known') {
        // Skip hidden files/dirs except a couple of allow-listed names.
        continue
      }
      if (entry.isDirectory()) {
        if (SKILL_FILE_LIST_EXCLUDE_DIRS.has(entry.name)) continue
        await walk(join(dir, entry.name), depth + 1)
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase()
        if ([...SKILL_FILE_LIST_EXCLUDE_EXT].some((ext) => lower.endsWith(ext))) continue
        if (out.length >= SKILL_FILE_LIST_MAX_ENTRIES) {
          truncated++
          continue
        }
        out.push(join(dir, entry.name))
      }
    }
  }

  await walk(rootDir, 0)
  return { files: out, truncated }
}

export async function loadSkill(
  skillName: string,
  index: SkillIndex,
  loadedSkills: LoadedSkillsRegistry,
  currentTurn: number
): Promise<SkillLoadResult> {
  const entry = index.skills.find((s) => s.name === skillName)

  if (!entry) {
    return { ok: false, reason: `Skill "${skillName}" not found. Available skills: ${index.skills.filter((s) => s.userInvocable).map((s) => s.name).join(', ') || 'none'}` }
  }

  if (!entry.userInvocable) {
    return { ok: false, reason: `Skill "${skillName}" is not user-invocable.` }
  }

  if (loadedSkills[skillName]) {
    const prev = loadedSkills[skillName]
    if (prev.sourceHash === entry.sourceHash) {
      return {
        ok: true,
        skillName,
        content: `[Skill "${skillName}" was already loaded in this session at turn ${prev.loadedAtTurn}. Use the existing instructions unless the user changes task.]`
      }
    }
  }

  let skillContent: string
  try {
    skillContent = await readFile(entry.path, 'utf-8')
  } catch {
    return { ok: false, reason: `Failed to read skill file for "${skillName}".` }
  }

  loadedSkills[skillName] = { sourceHash: entry.sourceHash, loadedAtTurn: currentTurn }

  const skillDir = dirname(entry.path)
  const { files, truncated } = await listSkillFiles(skillDir)
  const fileListSection =
    files.length > 0
      ? `Files available in this skill (absolute paths — use these directly when reading):\n` +
        files.map((f) => `  ${f}`).join('\n') +
        (truncated > 0 ? `\n  ... (${truncated} more files truncated)` : '') +
        `\n\nWhen SKILL.md references a file by relative path (e.g. "scripts/foo.js"), ` +
        `find the matching absolute path in the list above and use that directly. Do not guess paths.\n\n`
      : ''

  const header =
    `[SKILL ACTIVATED: ${skillName}]\n` +
    `Base directory for this skill: ${skillDir}\n\n` +
    fileListSection +
    `You MUST follow the instructions below for this response. ` +
    `They override your default behavior for this turn.\n\n`
  return { ok: true, skillName, content: header + skillContent }
}
