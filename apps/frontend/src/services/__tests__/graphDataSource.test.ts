import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getActiveImportSessionOrNull, ImportApiError } from '../importApi'
import { isEmptyGraph, loadImportedGraph } from '../graphDataSource'

const persisted = { data: { nodes: [{ id: 'persisted-1' } as any], links: [] }, source: 'persisted' as const, fallbackNotice: null }

describe('authoritative imported graph source', () => {
  it('treats only the expected active-import 404 as no active import', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({ statusCode: 404, message: 'No import session is available.' }), { status: 404 })) as typeof fetch
    try { assert.equal(await getActiveImportSessionOrNull(), null) }
    finally { globalThis.fetch = original }
  })

  it('does not hide unrelated active-import 404 responses', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({ statusCode: 404, message: 'Different missing resource' }), { status: 404 })) as typeof fetch
    try { await assert.rejects(getActiveImportSessionOrNull, /Different missing resource/) }
    finally { globalThis.fetch = original }
  })

  it('loads the persisted graph without probing a temporary import session', async () => {
    let previewCalls = 0
    const result = await loadImportedGraph(null, {}, {
      loadImportPreview: async () => { previewCalls++; throw new Error('must not be called') },
      loadPersisted: async () => persisted,
    })
    assert.equal(previewCalls, 0)
    assert.equal(result.source, 'persisted')
    assert.equal(result.data.nodes[0].id, 'persisted-1')
  })

  it('falls back to the persisted graph when an explicit import session expired', async () => {
    const result = await loadImportedGraph('expired-import', {}, {
      loadImportPreview: async () => { throw new ImportApiError('Import session not found', 404) },
      loadPersisted: async () => persisted,
    })
    assert.equal(result.source, 'persisted')
    assert.match(result.fallbackNotice ?? '', /persisted graph/)
  })

  it('uses an explicit active import preview where appropriate', async () => {
    let persistedCalls = 0
    const result = await loadImportedGraph('active-import', {}, {
      loadImportPreview: async () => ({ nodes: [{ id: 'preview-1' } as any], links: [], nodeCount: 1, relationshipCount: 0 } as any),
      loadPersisted: async () => { persistedCalls++; return persisted },
    })
    assert.equal(persistedCalls, 0)
    assert.equal(result.source, 'active-import')
    assert.equal(result.data.nodes[0].id, 'preview-1')
  })

  it('reports a true empty graph without turning it into an error', () => {
    assert.equal(isEmptyGraph({ nodes: [], links: [] }), true)
    assert.equal(isEmptyGraph(persisted.data), false)
  })
})
