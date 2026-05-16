import { describe, test, expect } from 'vitest'
import { findNextAction, emitSafeBoundary } from '../../src/main/tools'

describe('findNextAction (heredoc format)', () => {
  test('parses write_file with content heredoc', () => {
    const text = [
      '@@write_file',
      'path: app.js',
      'content <<EOF',
      'for (let y = 0; y < n; y++) {',
      '  console.log(y)',
      '}',
      'EOF',
      '@@end'
    ].join('\n')
    const r = findNextAction(text, 0)
    expect(r).not.toBeNull()
    expect(r).not.toBe('incomplete')
    if (!r || r === 'incomplete') return
    expect(r.name).toBe('write_file')
    expect(r.args.path).toBe('app.js')
    expect(r.args.content).toBe('for (let y = 0; y < n; y++) {\n  console.log(y)\n}')
  })

  test('preserves < inside heredoc body without escaping', () => {
    const text =
      '@@write_file\npath: a.js\ncontent <<X\nif (a < b && c > d) {}\nX\n@@end'
    const r = findNextAction(text, 0)
    if (!r || r === 'incomplete') throw new Error('expected parsed action')
    expect(r.args.content).toBe('if (a < b && c > d) {}')
  })

  test('parses action with no params', () => {
    const r = findNextAction('@@list_files\n@@end', 0)
    if (!r || r === 'incomplete') throw new Error('expected parsed action')
    expect(r.name).toBe('list_files')
    expect(Object.keys(r.args)).toHaveLength(0)
  })

  test('parses multiple heredocs (edit_file)', () => {
    const text = [
      '@@edit_file',
      'path: app.js',
      'old_string <<OLD',
      'foo',
      'OLD',
      'new_string <<NEW',
      'bar',
      'NEW',
      '@@end'
    ].join('\n')
    const r = findNextAction(text, 0)
    if (!r || r === 'incomplete') throw new Error('expected parsed action')
    expect(r.name).toBe('edit_file')
    expect(r.args.path).toBe('app.js')
    expect(r.args.old_string).toBe('foo')
    expect(r.args.new_string).toBe('bar')
  })

  test('parses boolean and number values from key:value lines', () => {
    const text = '@@edit_file\npath: a.js\nreplace_all: true\ncount: 3\n@@end'
    const r = findNextAction(text, 0)
    if (!r || r === 'incomplete') throw new Error('expected parsed action')
    expect(r.args.replace_all).toBe(true)
    expect(r.args.count).toBe(3)
  })

  test('returns incomplete when heredoc marker not yet emitted', () => {
    const text = '@@write_file\npath: a.js\ncontent <<EOF\nfor (let y'
    const r = findNextAction(text, 0)
    expect(r).toBe('incomplete')
  })

  test('returns incomplete when @@end not yet emitted', () => {
    const text = '@@write_file\npath: a.js\ncontent <<EOF\nbody\nEOF'
    const r = findNextAction(text, 0)
    expect(r).toBe('incomplete')
  })

  test('decodes &lt; &gt; &amp; defensively', () => {
    const text =
      '@@write_file\npath: a.js\ncontent <<X\nif (a &lt; b &amp;&amp; c &gt; d) {}\nX\n@@end'
    const r = findNextAction(text, 0)
    if (!r || r === 'incomplete') throw new Error('expected parsed action')
    expect(r.args.content).toBe('if (a < b && c > d) {}')
  })

  test('falls back to legacy XML format', () => {
    const text =
      '<action name="write_file">\n<path>a.js</path>\n<content>\nconst x = 1\n</content>\n</action>'
    const r = findNextAction(text, 0)
    if (!r || r === 'incomplete') throw new Error('expected parsed action')
    expect(r.name).toBe('write_file')
    expect(r.args.path).toBe('a.js')
    expect(r.args.content).toBe('const x = 1')
  })

  test('skips orphan @@end markers', () => {
    const text = '@@end\n@@list_files\n@@end'
    const r = findNextAction(text, 0)
    if (!r || r === 'incomplete') throw new Error('expected parsed action')
    expect(r.name).toBe('list_files')
  })
})

describe('emitSafeBoundary', () => {
  test('holds back forming @@<tool> opener at end of buffer', () => {
    const buf = 'some text\n@@write_file'
    const boundary = emitSafeBoundary(buf, 0)
    expect(boundary).toBe(buf.indexOf('@@'))
  })

  test('does not hold back @@ when followed by newline', () => {
    const buf = 'some text\n@@write_file\n'
    const boundary = emitSafeBoundary(buf, 0)
    expect(boundary).toBe(buf.length)
  })

  test('still holds back legacy <action', () => {
    const buf = 'some text\n<action'
    const boundary = emitSafeBoundary(buf, 0)
    expect(boundary).toBe(buf.indexOf('<action'))
  })

  test('emits when no action opener present', () => {
    const buf = 'just plain text with < comparison and @ symbol'
    const boundary = emitSafeBoundary(buf, 0)
    expect(boundary).toBe(buf.length)
  })
})
