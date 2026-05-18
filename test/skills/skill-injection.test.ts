import { describe, test, expect } from 'vitest'
import { parseSkillInjection } from '../../src/renderer/src/lib/skill-injection'

describe('parseSkillInjection', () => {
  test('returns null for an ordinary user message', () => {
    expect(parseSkillInjection('hello world')).toBeNull()
    expect(parseSkillInjection('$gen-pptx make slides')).toBeNull()
    expect(parseSkillInjection('do something\n\n---\n\nmore')).toBeNull()
  })

  test('parses a full activation injection', () => {
    const injection =
      '[SKILL ACTIVATED: gen-pptx]\nBase directory: /tmp/x\n\nEXECUTION CONTRACT\n...body...'
    const userText = 'make slides about cats'
    const result = parseSkillInjection(injection + '\n\n---\n\n' + userText)
    expect(result).not.toBeNull()
    expect(result!.skillName).toBe('gen-pptx')
    expect(result!.injectionContent).toBe(injection)
    expect(result!.userText).toBe(userText)
  })

  test('parses a dedup stub injection', () => {
    const stub =
      '[Skill "gen-pptx" was already loaded in this session at turn 3. Use the existing instructions unless the user changes task.]'
    const userText = 'continue'
    const result = parseSkillInjection(stub + '\n\n---\n\n' + userText)
    expect(result).not.toBeNull()
    expect(result!.skillName).toBe('gen-pptx')
    expect(result!.injectionContent).toBe(stub)
    expect(result!.userText).toBe(userText)
  })

  test('uses the last divider when SKILL.md body contains horizontal rules', () => {
    // SKILL.md may use markdown `---` separators internally. The injection
    // header is appended last, so the final `\n\n---\n\n` is always the
    // skill/user boundary.
    const injection =
      '[SKILL ACTIVATED: foo]\nsection 1\n\n---\n\nsection 2 inside skill body'
    const userText = 'actual user question'
    const result = parseSkillInjection(injection + '\n\n---\n\n' + userText)
    expect(result).not.toBeNull()
    expect(result!.injectionContent).toBe(injection)
    expect(result!.userText).toBe(userText)
  })

  test('returns null when sentinel prefix present but divider missing', () => {
    expect(parseSkillInjection('[SKILL ACTIVATED: foo]\nno divider here')).toBeNull()
  })

  test('extracts hyphenated skill names', () => {
    const result = parseSkillInjection(
      '[SKILL ACTIVATED: use-cortex-project-memory]\nbody\n\n---\n\nq'
    )
    expect(result!.skillName).toBe('use-cortex-project-memory')
  })
})
