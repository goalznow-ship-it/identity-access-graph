import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clearAccessToken, getAccessToken, hasMinimumRole, installAuthenticatedFetch, storeAccessToken } from '../authApi'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('frontend authentication transport', () => {
  it('applies inherited role permissions', () => {
    assert.equal(hasMinimumRole('ADMIN', 'ANALYST'), true)
    assert.equal(hasMinimumRole('ANALYST', 'ANALYST'), true)
    assert.equal(hasMinimumRole('VIEWER', 'ANALYST'), false)
    assert.equal(hasMinimumRole(undefined, 'VIEWER'), false)
  })
  it('stores session tokens in tab-scoped storage', () => {
    const previous = (globalThis as any).sessionStorage
    ;(globalThis as any).sessionStorage = new MemoryStorage()
    try { storeAccessToken('signed-token'); assert.equal(getAccessToken(), 'signed-token'); clearAccessToken(); assert.equal(getAccessToken(), '') }
    finally { (globalThis as any).sessionStorage = previous }
  })

  it('attaches bearer tokens to API requests and clears expired sessions', async () => {
    const previous = (globalThis as any).sessionStorage
    ;(globalThis as any).sessionStorage = new MemoryStorage(); storeAccessToken('signed-token')
    let authorization = '', calls = 0
    const target: any = { fetch: async (_input: unknown, init: RequestInit) => { calls++; authorization = new Headers(init.headers).get('Authorization') ?? ''; return new Response(null, { status: calls === 1 ? 200 : 401 }) } }
    const restore = installAuthenticatedFetch(target)
    try {
      assert.equal((await target.fetch('/graph/summary')).status, 200); assert.equal(authorization, 'Bearer signed-token')
      assert.equal((await target.fetch('/graph/summary')).status, 401); assert.equal(getAccessToken(), '')
    } finally { restore(); (globalThis as any).sessionStorage = previous }
  })
})
