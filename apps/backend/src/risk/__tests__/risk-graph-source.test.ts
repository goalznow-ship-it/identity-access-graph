import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ServiceUnavailableException } from '@nestjs/common'
import { RiskGraphSourceService } from '../risk-graph-source.service'

const disabledNeo4j = { isEnabled: () => false }

describe('risk graph source safety', () => {
  it('fails closed when production has neither Neo4j nor an imported graph', async () => {
    const source = new RiskGraphSourceService({} as any, disabledNeo4j as any)
    assert.deepEqual(source.status(), { neo4jAvailable: false, memoryAvailable: false, memorySource: 'unavailable' })
    await assert.rejects(() => source.load('auto'), ServiceUnavailableException)
    await assert.rejects(() => source.load('memory'), /persist an imported graph/)
  })

  it('hydrates and serves the durable imported graph without Neo4j', async () => {
    const graph = { nodes: [{ id: 'user-1' }], relationships: [] }
    const store = { loadGraph: async () => ({ payload: graph }) }
    const source = new RiskGraphSourceService({} as any, disabledNeo4j as any, store as any)
    await source.onModuleInit()
    assert.equal(source.status().memorySource, 'imported')
    assert.deepEqual(await source.load('auto'), graph)
  })

  it('uses Neo4j for automatic production analysis when enabled', async () => {
    const graph = { getSubgraph: async () => ({ nodes: [{ id: 'live-user' }], relationships: [], partial: false }) }
    const source = new RiskGraphSourceService(graph as any, { isEnabled: () => true } as any)
    assert.equal((await source.load('auto')).nodes[0].id, 'live-user')
  })
})
