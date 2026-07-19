import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { pipelineApi } from '../pipelineApi'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

describe('pipeline operations API', () => {
  it('loads pipeline state, snapshots, and input readiness', async () => {
    const paths: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const path = String(input); paths.push(path)
      const body = path.endsWith('/input-status') ? { ready: true, source: 'neo4j', productionSafe: true, message: 'Ready' } : path.endsWith('/snapshots') ? [] : { status: 'IDLE' }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch
    const [state, snapshots, status] = await Promise.all([pipelineApi.getState(), pipelineApi.getSnapshots(), pipelineApi.getInputStatus()])
    assert.equal(state.status, 'IDLE'); assert.deepEqual(snapshots, []); assert.equal(status.source, 'neo4j')
    assert.ok(paths.some(path => path.endsWith('/pipeline/input-status')))
  })

  it('surfaces structured backend errors without raw JSON', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ statusCode: 503, message: 'Neo4j is disabled' }), { status: 503 })) as typeof fetch
    await assert.rejects(() => pipelineApi.start(), (error: Error & { status?: number }) => error.message === 'Neo4j is disabled' && error.status === 503)
  })
})
