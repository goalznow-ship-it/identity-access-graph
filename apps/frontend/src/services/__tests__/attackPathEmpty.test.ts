import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getAvailablePrivilegedTargets } from '../attackPathApi'

describe('attack path empty graph initialization', () => {
  it('does not request privileged targets when the authoritative graph is empty', async () => {
    const original = globalThis.fetch
    const urls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      urls.push(String(input))
      return new Response(JSON.stringify({ nodeCount: 0, relationshipCount: 0, database: 'imported', timestamp: new Date().toISOString() }), { status: 200 })
    }) as typeof fetch
    try {
      assert.deepEqual(await getAvailablePrivilegedTargets(), [])
      assert.deepEqual(urls, ['/api/graph/stats'])
    } finally { globalThis.fetch = original }
  })
})
