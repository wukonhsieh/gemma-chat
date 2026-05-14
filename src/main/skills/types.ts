export interface SkillFrontmatter {
  name: string
  description: string
  summary?: string
  'user-invocable'?: boolean
  'disable-model-invocation'?: boolean
  risk?: 'low' | 'medium' | 'high'
  triggers?: string[]
  type?: string
}

export interface SkillMetadata {
  name: string
  description: string
  summary: string
  userInvocable: boolean
  modelInvocable: boolean
  risk: 'low' | 'medium' | 'high'
  triggers: string[]
  type: string
  scope: 'project' | 'global' | 'builtin'
  path: string
  sourceHash: string
}

export interface SkillsLockFile {
  version: number
  generatedAt: string
  skills: Record<string, SkillMetadata>
}

export interface SkillIndexEntry {
  name: string
  summary: string
  type: string
  modelInvocable: boolean
  userInvocable: boolean
  triggers: string[]
  risk: 'low' | 'medium' | 'high'
  path: string
  sourceHash: string
  scope: 'project' | 'global' | 'builtin'
}

export interface SkillUiEntry {
  name: string
  summary: string
  userInvocable: boolean
  modelInvocable: boolean
  risk: 'low' | 'medium' | 'high'
}

export interface SkillIndex {
  skills: SkillIndexEntry[]
}

export type SkillLoadResult =
  | { ok: true; content: string; skillName: string }
  | { ok: false; reason: string }
