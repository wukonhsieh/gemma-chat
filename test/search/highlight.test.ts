import { describe, test, expect } from 'vitest'
import { countMatches, highlightHtml } from '../../src/renderer/src/lib/highlight'

describe('countMatches', () => {
  test('case-insensitive: counts both cases', () => {
    expect(countMatches('Hello World hello', 'hello')).toBe(2)
  })

  test('empty query returns 0', () => {
    expect(countMatches('some text', '')).toBe(0)
  })

  test('no match returns 0', () => {
    expect(countMatches('foo bar', 'xyz')).toBe(0)
  })
})

describe('highlightHtml', () => {
  test('wraps text node match in <mark>', () => {
    const result = highlightHtml('<p>hello world</p>', 'world', 0)
    expect(result).toContain('<mark')
    expect(result).toContain('world</mark>')
    expect(result).toContain('<p>hello ')
    expect(result).toContain('</p>')
  })

  test('does not match text inside tag attributes', () => {
    const result = highlightHtml('<a href="/world">visit</a>', 'world', 0)
    // href value must not be wrapped; only text content could match
    expect(result).toContain('href="/world"')
    expect(result).not.toContain('href="/<mark')
  })

  test('empty query returns html unchanged', () => {
    const html = '<p>hello <strong>world</strong></p>'
    expect(highlightHtml(html, '', 0)).toBe(html)
  })

  test('does not break code block structure', () => {
    const html = '<pre><code>const hello = 1</code></pre>'
    const result = highlightHtml(html, 'hello', 0)
    // <pre> and <code> tags must remain intact
    expect(result).toContain('<pre>')
    expect(result).toContain('<code>')
    expect(result).toContain('</code>')
    expect(result).toContain('</pre>')
    // match is inside text node, should be wrapped
    expect(result).toContain('<mark')
  })
})
