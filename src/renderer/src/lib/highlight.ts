export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function countMatches(text: string, query: string): number {
  if (!query) return 0
  return (text.match(new RegExp(escapeRegex(query), 'gi')) ?? []).length
}

// Injects <mark> tags around query matches in a marked-generated HTML string.
// Processes only text nodes (between tags) — never matches inside tag names or attributes.
// matchOffset is reserved for Task 3 (data-match-idx attribution); unused here.
export function highlightHtml(html: string, query: string, _matchOffset: number): string {
  if (!query) return html
  const escaped = escapeRegex(query)
  return html.replace(
    /(<[^>]*>)|([^<]+)/g,
    (_, tag: string | undefined, text: string | undefined) => {
      if (tag !== undefined) return tag
      if (!text) return ''
      return text.replace(
        new RegExp(escaped, 'gi'),
        (match) =>
          `<mark style="background:rgba(250,204,21,0.3);border-radius:2px;padding:0">${match}</mark>`
      )
    }
  )
}
