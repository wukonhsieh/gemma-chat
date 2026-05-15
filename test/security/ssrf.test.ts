/**
 * Security tests: SSRF (Server-Side Request Forgery) in fetch_url.
 *
 * The current implementation blocks localhost, private IP ranges, and link-local
 * cloud metadata endpoints before fetch() is called.
 *
 * Safe to run: global fetch is mocked in this file, so tests never make real
 * outbound HTTP requests.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { runTool, type ToolContext } from '../../src/main/tools'
import { createTestWorkspace, type TestWorkspace } from './helpers'

let ws: TestWorkspace
let ctx: ToolContext
let originalFetch: typeof globalThis.fetch

async function expectBlockedWithoutFetch(url: string): Promise<void> {
  const r = await runTool('fetch_url', { url }, ctx)
  expect(r).toMatch(/Error: fetching localhost or private addresses is not allowed/)
  expect(globalThis.fetch).not.toHaveBeenCalled()
}

beforeEach(async () => {
  ws = await createTestWorkspace('ssrf')
  ctx = { conversationId: ws.id }
  originalFetch = globalThis.fetch
  globalThis.fetch = vi.fn(async () => new Response('mock response', { status: 200 }))
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  await ws.cleanup()
})

// ─── Input validation that IS currently enforced ─────────────────────────────

describe('fetch_url: input validation (currently enforced)', () => {
  test('empty url returns error', async () => {
    const r = await runTool('fetch_url', { url: '' }, ctx)
    expect(r).toMatch(/Error/)
  })

  test('non-http scheme blocked (ftp)', async () => {
    const r = await runTool('fetch_url', { url: 'ftp://example.com/file' }, ctx)
    expect(r).toMatch(/Error.*url must be http/)
  })

  test('non-http scheme blocked (file)', async () => {
    const r = await runTool('fetch_url', { url: 'file:///etc/passwd' }, ctx)
    expect(r).toMatch(/Error.*url must be http/)
  })

  test('non-http scheme blocked (javascript)', async () => {
    const r = await runTool('fetch_url', { url: 'javascript:alert(1)' }, ctx)
    expect(r).toMatch(/Error.*url must be http/)
  })
})

// ─── SSRF protection: private/loopback addresses are rejected pre-fetch ──────

describe('fetch_url: SSRF protection — localhost', () => {
  test('http://127.0.0.1 is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://127.0.0.1:19991')
  })

  test('http://localhost is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://localhost:19992')
  })

  test('http://[::1] IPv6 loopback is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://[::1]:19993')
  })
})

describe('fetch_url: SSRF protection — private IPv4 ranges', () => {
  test('http://10.0.0.1 is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://10.0.0.1:19994')
  })

  test('http://172.16.0.1 is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://172.16.0.1:19995')
  })

  test('http://192.168.0.1 is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://192.168.0.1:19996')
  })
})

describe('fetch_url: SSRF protection — cloud metadata endpoints', () => {
  test('http://169.254.169.254 is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://169.254.169.254/latest/meta-data/')
  })
})

// ─── Decimal / hex IP encoding bypass ────────────────────────────────────────
//
// Some SSRF filters check string representations but not normalized IPs.
// URL parsing normalizes these before the private-host guard runs.

describe('fetch_url: alternative IP representations', () => {
  test('http://2130706433 (decimal 127.0.0.1) is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://2130706433:19997')
  })

  test('http://0x7f000001 (hex 127.0.0.1) is blocked before fetch', async () => {
    await expectBlockedWithoutFetch('http://0x7f000001:19998')
  })
})

// ─── Scheme-confusion attacks ─────────────────────────────────────────────────

describe('scheme confusion', () => {
  test('public-looking host goes through mocked fetch only', async () => {
    const r = await runTool('fetch_url', { url: 'http://internal.corp.local:19999' }, ctx)
    expect(r).toBe('mock response')
    expect(globalThis.fetch).toHaveBeenCalledOnce()
  })
})
