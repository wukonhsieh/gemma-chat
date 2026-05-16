export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function countMatches(text: string, query: string): number {
  if (!query) return 0
  return (text.match(new RegExp(escapeRegex(query), 'gi')) ?? []).length
}

// Injects <mark> tags around query matches in a marked-generated HTML string.
// Processes only text nodes (between tags) — never matches inside tag names or attributes.
// matchOffset: global index of this message's first match (prefix sum from Chat.tsx).
// activeMatchIndex: the globally active match; active mark gets a brighter background.
export function highlightHtml(
  html: string,
  query: string,
  matchOffset: number,
  activeMatchIndex?: number
): string {
  if (!query) return html
  const escaped = escapeRegex(query)
  let localIdx = 0
  return html.replace(
    /(<[^>]*>)|([^<]+)/g,
    (_, tag: string | undefined, text: string | undefined) => {
      if (tag !== undefined) return tag
      if (!text) return ''
      return text.replace(new RegExp(escaped, 'gi'), (match) => {
        const globalIdx = matchOffset + localIdx
        localIdx++
        const isActive = activeMatchIndex !== undefined && globalIdx === activeMatchIndex
        const bg = isActive
          ? 'background:rgba(250,204,21,0.8);border-radius:2px;padding:0'
          : 'background:rgba(250,204,21,0.3);border-radius:2px;padding:0'
        return `<mark data-match-idx="${globalIdx}" style="${bg}">${match}</mark>`
      })
    }
  )
}
