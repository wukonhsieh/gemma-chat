// Matches $skill-name at start of message or inline, followed by space or end of string.
// Skill names may contain letters, digits, and hyphens.
const SKILL_PATTERN = /(?:^|\s)\$([a-zA-Z0-9][a-zA-Z0-9-]*)(?=\s|$)/

export interface SkillInvocation {
  skillName: string | null
  strippedMessage: string
}

export function detectSkillInvocation(message: string): SkillInvocation {
  const match = message.match(SKILL_PATTERN)
  if (!match) {
    return { skillName: null, strippedMessage: message }
  }

  const skillName = match[1]
  const strippedMessage = message.replace(match[0], ' ').replace(/\s{2,}/g, ' ').trim()

  return { skillName, strippedMessage }
}
