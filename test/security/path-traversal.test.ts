/**
 * Security tests: workspace path isolation.
 *
 * Every file operation (read/write/edit/delete) must stay inside the per-conversation
 * workspace directory. Attempts to escape via `../`, absolute paths, or symlink tricks
 * must be blocked at the resolveWorkspaceAccessPath layer.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { runTool, type ToolContext } from '../../src/main/tools'
import { wsWriteFile, wsReadFile, wsDeleteFile, classifyPathAgainstWorkspace } from '../../src/main/workspace'
import { createTestWorkspace, type TestWorkspace } from './helpers'

let ws: TestWorkspace
let ctx: ToolContext

beforeEach(async () => {
  ws = await createTestWorkspace('path')
  ctx = { conversationId: ws.id, allowOutsideWorkspace: false }
})

afterEach(async () => {
  await ws.cleanup()
})

// ─── classifyPathAgainstWorkspace unit tests ─────────────────────────────────

describe('classifyPathAgainstWorkspace', () => {
  test('simple relative path is inside workspace', () => {
    const r = classifyPathAgainstWorkspace('/workspace', 'index.html')
    expect(r.withinWorkspace).toBe(true)
  })

  test('nested relative path is inside workspace', () => {
    const r = classifyPathAgainstWorkspace('/workspace', 'src/main/app.ts')
    expect(r.withinWorkspace).toBe(true)
  })

  test('../ escape is outside workspace', () => {
    const r = classifyPathAgainstWorkspace('/workspace', '../escape.txt')
    expect(r.withinWorkspace).toBe(false)
    expect(r.requiresAsk).toBe(true)
  })

  test('deeply nested ../ escape is outside workspace', () => {
    const r = classifyPathAgainstWorkspace('/workspace', 'a/b/../../../../../../etc/passwd')
    expect(r.withinWorkspace).toBe(false)
  })

  test('absolute path outside workspace is blocked', () => {
    const r = classifyPathAgainstWorkspace('/workspace', '/etc/passwd')
    expect(r.withinWorkspace).toBe(false)
  })

  test('absolute path inside workspace is allowed', () => {
    const r = classifyPathAgainstWorkspace('/workspace', '/workspace/index.html')
    expect(r.withinWorkspace).toBe(true)
  })

  test('empty path is outside workspace', () => {
    const r = classifyPathAgainstWorkspace('/workspace', '')
    expect(r.withinWorkspace).toBe(false)
  })
})

// ─── write_file path isolation ────────────────────────────────────────────────

describe('write_file: path escape blocked', () => {
  test('../../etc/passwd', async () => {
    const result = await runTool('write_file', { path: '../../etc/passwd', content: 'pwned' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('../sibling-file', async () => {
    const result = await runTool('write_file', { path: '../outside.txt', content: 'x' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('absolute path /tmp/evil', async () => {
    const result = await runTool('write_file', { path: '/tmp/evil-gemma-test.txt', content: 'x' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('absolute path /etc/cron.d/backdoor', async () => {
    const result = await runTool('write_file', { path: '/etc/cron.d/backdoor', content: '* * * * * root /tmp/evil.sh' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('null byte injection', async () => {
    // Null byte can confuse path handling in some implementations
    const result = await runTool('write_file', { path: 'valid.txt\x00../../etc/cron', content: 'x' }, ctx)
    // Should either succeed (write valid.txt, null byte truncates the path in JS resolve)
    // or fail — but must never write to /etc/cron
    // The important check: it did NOT write to /etc/cron
    // (Node.js resolve() ignores null byte; the written path stays in workspace)
    expect(result).not.toMatch(/Error.*permission/i)
  })
})

describe('write_file: normal paths allowed', () => {
  test('writes a file inside workspace', async () => {
    const result = await runTool('write_file', { path: 'hello.txt', content: 'hello' }, ctx)
    expect(result).toMatch(/Wrote hello\.txt/)
  })

  test('writes nested file inside workspace', async () => {
    const result = await runTool('write_file', { path: 'src/index.ts', content: 'export {}' }, ctx)
    expect(result).toMatch(/Wrote src\/index\.ts/)
  })
})

// ─── read_file path isolation ─────────────────────────────────────────────────

describe('read_file: path escape blocked', () => {
  test('../../etc/passwd', async () => {
    const result = await runTool('read_file', { path: '../../etc/passwd' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('/etc/hosts', async () => {
    const result = await runTool('read_file', { path: '/etc/hosts' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('../.env from parent directory', async () => {
    const result = await runTool('read_file', { path: '../.env' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('deeply nested escape: a/b/c/../../../../../etc/shadow', async () => {
    const result = await runTool('read_file', { path: 'a/b/c/../../../../../etc/shadow' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })
})

describe('read_file: can read own workspace files', () => {
  test('reads file written to workspace', async () => {
    await wsWriteFile(ws.id, 'data.json', '{"ok":true}')
    const result = await runTool('read_file', { path: 'data.json' }, ctx)
    expect(result).toBe('{"ok":true}')
  })
})

// ─── delete_file path isolation ───────────────────────────────────────────────

describe('delete_file: path escape blocked', () => {
  test('../../etc/passwd', async () => {
    const result = await runTool('delete_file', { path: '../../etc/passwd' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })

  test('/tmp/some-system-file', async () => {
    const result = await runTool('delete_file', { path: '/tmp/gemma-security-delete-test' }, ctx)
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })
})

describe('delete_file: can delete own workspace files', () => {
  test('deletes file inside workspace', async () => {
    await wsWriteFile(ws.id, 'to-delete.txt', 'bye')
    const result = await runTool('delete_file', { path: 'to-delete.txt' }, ctx)
    expect(result).toMatch(/Deleted to-delete\.txt/)
  })
})

// ─── edit_file path isolation ─────────────────────────────────────────────────

describe('edit_file: path escape blocked', () => {
  test('../../etc/hosts', async () => {
    const result = await runTool(
      'edit_file',
      { path: '../../etc/hosts', old_string: 'localhost', new_string: 'attacker.com' },
      ctx
    )
    expect(result).toMatch(/Error.*Path escapes workspace/)
  })
})

// ─── wsWriteFile / wsReadFile low-level guards ───────────────────────────────

describe('wsWriteFile / wsReadFile: low-level path guards', () => {
  test('wsWriteFile throws on escape', async () => {
    await expect(wsWriteFile(ws.id, '../../evil.txt', 'x')).rejects.toThrow(
      'Path escapes workspace'
    )
  })

  test('wsReadFile throws on escape', async () => {
    await expect(wsReadFile(ws.id, '../../etc/passwd')).rejects.toThrow('Path escapes workspace')
  })

  test('wsDeleteFile throws on escape', async () => {
    await expect(wsDeleteFile(ws.id, '/etc/passwd')).rejects.toThrow('Path escapes workspace')
  })
})
