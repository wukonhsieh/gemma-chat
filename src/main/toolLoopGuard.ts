export const LOOP_WINDOW = 15
export const MAX_CYCLE_LEN = 5
export const CYCLE_REPEATS = 3

function sizeBucket(n: number): number {
  if (n <= 0) return 0
  return Math.floor(Math.log2(n))
}

export function toolFingerprint(name: string, args: Record<string, unknown>): string {
  const a = args ?? {}
  const path = typeof a.path === 'string' ? a.path : ''
  const url = typeof a.url === 'string' ? a.url : ''
  const query = typeof a.query === 'string' ? a.query : ''
  const command = typeof a.command === 'string' ? a.command : ''
  const content = typeof a.content === 'string' ? a.content : ''
  const oldStr =
    typeof a.old === 'string' ? a.old : typeof a.old_string === 'string' ? a.old_string : ''
  const newStr =
    typeof a.new === 'string' ? a.new : typeof a.new_string === 'string' ? a.new_string : ''
  return [
    name,
    path,
    url,
    query,
    command,
    `cs:${sizeBucket(content.length)}`,
    `os:${sizeBucket(oldStr.length)}`,
    `ns:${sizeBucket(newStr.length)}`
  ].join('|')
}

export function detectToolLoop(history: string[]): { k: number } | null {
  for (let k = 1; k <= MAX_CYCLE_LEN; k++) {
    const need = k * CYCLE_REPEATS
    if (history.length < need) continue
    const tail = history.slice(history.length - need)
    let ok = true
    for (let i = k; i < need && ok; i++) {
      if (tail[i] !== tail[i % k]) ok = false
    }
    if (ok) return { k }
  }
  return null
}
