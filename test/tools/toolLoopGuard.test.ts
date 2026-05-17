import { describe, it, expect } from 'vitest'
import {
  detectToolLoop,
  toolFingerprint,
  LOOP_WINDOW,
  CYCLE_REPEATS,
  MAX_CYCLE_LEN
} from '../../src/main/toolLoopGuard'

describe('toolFingerprint', () => {
  it('produces equal fingerprints for identical calls', () => {
    const a = toolFingerprint('read_file', { path: 'src/foo.ts' })
    const b = toolFingerprint('read_file', { path: 'src/foo.ts' })
    expect(a).toBe(b)
  })

  it('distinguishes different tools / paths', () => {
    expect(toolFingerprint('read_file', { path: 'a' })).not.toBe(
      toolFingerprint('read_file', { path: 'b' })
    )
    expect(toolFingerprint('read_file', { path: 'a' })).not.toBe(
      toolFingerprint('write_file', { path: 'a' })
    )
  })

  it('buckets content size by log2 so small edits collide', () => {
    const small = toolFingerprint('write_file', { path: 'a', content: 'x'.repeat(100) })
    const sameBucket = toolFingerprint('write_file', { path: 'a', content: 'x'.repeat(120) })
    const diffBucket = toolFingerprint('write_file', { path: 'a', content: 'x'.repeat(10000) })
    expect(small).toBe(sameBucket)
    expect(small).not.toBe(diffBucket)
  })
})

describe('detectToolLoop', () => {
  it('returns null on empty / short history', () => {
    expect(detectToolLoop([])).toBeNull()
    expect(detectToolLoop(['A', 'A'])).toBeNull()
  })

  it('detects k=1 (AAA at tail)', () => {
    expect(detectToolLoop(['X', 'Y', 'A', 'A', 'A'])).toEqual({ k: 1 })
  })

  it('detects ABCABCABC (k=3)', () => {
    expect(detectToolLoop(['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C'])).toEqual({ k: 3 })
  })

  it('detects ABCDEABCDEABCDE (k=5) within window', () => {
    const seq = ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E']
    expect(seq.length).toBe(LOOP_WINDOW)
    expect(detectToolLoop(seq)).toEqual({ k: 5 })
  })

  it('does not flag partial repeats like ABCAB', () => {
    expect(detectToolLoop(['A', 'B', 'C', 'A', 'B'])).toBeNull()
  })

  it('does not flag two repetitions only (needs CYCLE_REPEATS)', () => {
    expect(CYCLE_REPEATS).toBe(3)
    expect(detectToolLoop(['A', 'B', 'A', 'B'])).toBeNull()
  })

  it('does not flag varied tool batches', () => {
    expect(
      detectToolLoop(['read:a', 'read:b', 'read:c', 'read:d', 'read:e', 'write:x'])
    ).toBeNull()
  })

  it('prefers shorter cycle when both fit (AAAAAA reports k=1, not k=2)', () => {
    expect(detectToolLoop(['A', 'A', 'A', 'A', 'A', 'A'])).toEqual({ k: 1 })
  })

  it('ignores cycles longer than MAX_CYCLE_LEN', () => {
    // k=6 cycle, repeated 3 times → 18 entries, but k=6 > MAX_CYCLE_LEN(=5)
    expect(MAX_CYCLE_LEN).toBe(5)
    const cycle = ['A', 'B', 'C', 'D', 'E', 'F']
    expect(detectToolLoop([...cycle, ...cycle, ...cycle])).toBeNull()
  })
})
