import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allowedGraphSource, getStoredGraphSource } from '../../hooks/useGraphSource'

describe('graph source helpers', () => {
  it('validates allowed source modes', () => {
    assert.equal(allowedGraphSource('neo4j'), 'neo4j')
    assert.equal(allowedGraphSource('imported'), 'imported')
    assert.equal(allowedGraphSource('mock'), 'neo4j')
    assert.equal(allowedGraphSource('unknown'), 'neo4j')
    assert.equal(allowedGraphSource(null), 'neo4j')
    assert.equal(allowedGraphSource(undefined), 'neo4j')
  })

  it('reads stored graph source from localStorage key', () => {
    const storage = { getItem: (k: string) => k === 'iag-graph-source' ? 'imported' : null }
    assert.equal(getStoredGraphSource(storage), 'imported')

    const storage2 = { getItem: () => null }
    assert.equal(getStoredGraphSource(storage2), 'neo4j')
  })

  it('falls back to settings when key is absent', () => {
    const storage = { getItem: () => null }
    const result = getStoredGraphSource(storage)
    assert.ok(['neo4j', 'imported'].includes(result))
  })
})
