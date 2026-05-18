// Sentinel-based parsing of user messages that were rewritten by the main
// process after a successful `$skill-name` invocation. See
// src/main/skills/loader.ts for the producing side and the
// `chat:rewrite_message` IPC contract in src/main/index.ts.

const SKILL_INJECTION_DIVIDER = '\n\n---\n\n'

export interface SkillInjection {
  skillName: string
  injectionContent: string
  userText: string
}

export function parseSkillInjection(content: string): SkillInjection | null {
  let skillName: string | null = null
  const fullMatch = content.match(/^\[SKILL ACTIVATED: ([^\]]+)\]/)
  if (fullMatch) {
    skillName = fullMatch[1]
  } else {
    const stubMatch = content.match(/^\[Skill "([^"]+)" was already loaded/)
    if (stubMatch) skillName = stubMatch[1]
  }
  if (!skillName) return null
  const dividerIdx = content.lastIndexOf(SKILL_INJECTION_DIVIDER)
  if (dividerIdx === -1) return null
  return {
    skillName,
    injectionContent: content.slice(0, dividerIdx),
    userText: content.slice(dividerIdx + SKILL_INJECTION_DIVIDER.length)
  }
}
