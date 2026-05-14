import { readFile } from 'fs/promises'
import type { SkillIndex, SkillLoadResult } from './types'

export interface LoadedSkillsRegistry {
  [skillName: string]: { sourceHash: string; loadedAtTurn: number }
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

  const header = `The following skill has been selected and loaded.\n\nSkill name: ${skillName}\nSkill version: ${entry.sourceHash}\n\n`
  return { ok: true, skillName, content: header + skillContent }
}
