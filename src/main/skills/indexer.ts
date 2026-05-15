import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { SkillsLockFile, SkillIndex, SkillIndexEntry, SkillUiEntry } from './types'

function catalogLines(
  skills: Array<{ name: string; type: string; risk: string; summary: string; triggers: string[] }>
): string {
  const lines: string[] = ['available_skills:']
  for (const s of skills) {
    lines.push(`  - name: ${s.name}`)
    lines.push(`    type: ${s.type}`)
    lines.push(`    risk: ${s.risk}`)
    lines.push(`    summary: ${s.summary}`)
    if (s.triggers.length > 0) {
      lines.push(`    triggers:`)
      for (const t of s.triggers) lines.push(`      - ${t}`)
    }
  }
  lines.push('')
  lines.push('rules:')
  lines.push('  - Use a skill only if the user request clearly matches its summary or triggers.')
  lines.push('  - Do not invent skill names.')
  lines.push('  - If no skill matches, use no skill.')
  lines.push('  - Hidden skills may exist but are not available for model invocation.')
  return lines.join('\n')
}

export function buildSkillIndex(lock: SkillsLockFile): SkillIndex {
  const skills: SkillIndexEntry[] = Object.values(lock.skills).map((s) => ({
    name: s.name,
    summary: s.summary,
    type: s.type,
    modelInvocable: s.modelInvocable,
    userInvocable: s.userInvocable,
    triggers: s.triggers,
    risk: s.risk,
    path: s.path,
    sourceHash: s.sourceHash,
    scope: s.scope
  }))
  return { skills }
}

export function buildSkillCatalog(lock: SkillsLockFile): string {
  return catalogLines(Object.values(lock.skills).filter((s) => s.modelInvocable))
}

export function buildSkillCatalogFromIndex(index: SkillIndex): string {
  return catalogLines(index.skills.filter((s) => s.modelInvocable))
}

export function buildSkillUiIndex(lock: SkillsLockFile): SkillUiEntry[] {
  return Object.values(lock.skills).map((s) => ({
    name: s.name,
    summary: s.summary,
    userInvocable: s.userInvocable,
    modelInvocable: s.modelInvocable,
    risk: s.risk
  }))
}

export async function writeSkillArtifacts(
  projectRoot: string,
  lock: SkillsLockFile
): Promise<{ index: SkillIndex; uiIndex: SkillUiEntry[] }> {
  const cacheDir = join(projectRoot, '.agents', 'cache')
  await mkdir(cacheDir, { recursive: true })

  const index = buildSkillIndex(lock)
  const catalog = buildSkillCatalog(lock)
  const uiIndex = buildSkillUiIndex(lock)

  await Promise.all([
    writeFile(join(cacheDir, 'skill-index.json'), JSON.stringify(index, null, 2), 'utf-8'),
    writeFile(join(cacheDir, 'skill-catalog.yaml'), catalog, 'utf-8'),
    writeFile(join(cacheDir, 'skill-ui-index.json'), JSON.stringify(uiIndex, null, 2), 'utf-8')
  ])

  return { index, uiIndex }
}
