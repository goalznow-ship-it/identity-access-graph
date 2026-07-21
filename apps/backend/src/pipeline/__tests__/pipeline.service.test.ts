import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { ServiceUnavailableException } from '@nestjs/common'
import { PipelineService } from '../pipeline.service'
import { PipelineStatus, PIPELINE_STAGES_ORDER } from '../../../../../packages/shared-types/src'

const mockGraph = {
  isPersistenceEnabled: () => true,
  exportNodes: async () => ({ items: [{ id: 'neo-user', nodeType: 'USER', displayName: 'Neo User', properties: {} }, { id: 'neo-app', nodeType: 'APPLICATION', displayName: 'Neo App', properties: {} }], truncated: false }),
  exportRelationships: async () => ({ items: [{ relationship: { id: 'neo-edge', sourceNodeId: 'neo-user', targetNodeId: 'neo-app', relationshipType: 'USES' } }], truncated: false }),
}

const mockGraphEmpty = {
  isPersistenceEnabled: () => true,
  exportNodes: async () => ({ items: [{ id: 'neo-user', nodeType: 'USER', displayName: 'Neo User', properties: {} }], truncated: false }),
  exportRelationships: async () => ({ items: [], truncated: false }),
}

describe('PipelineService', () => {
  it('should start in idle state', () => {
    const service = new PipelineService()
    const state = service.getState()
    assert.strictEqual(state.status, PipelineStatus.Idle)
    assert.strictEqual(state.completedStages.length, 0)
  })

  it('should run full pipeline on start when Neo4j is available', async () => {
    const service = new PipelineService(undefined, mockGraph as any)
    const result = await service.start()
    assert.strictEqual(result.status, PipelineStatus.Completed)
    assert.strictEqual(result.completedStages.length, PIPELINE_STAGES_ORDER.length)
  })

  it('should load the authoritative Neo4j snapshot for each full run', async () => {
    const service = new PipelineService(undefined, mockGraph as any)
    await service.start()
    const first = service.getSnapshots()[0]
    assert.strictEqual(first.result.inputCount, 2)
    assert.strictEqual(first.output.metadata.source, 'neo4j')
  })

  it('should load Neo4j before step-by-step execution', async () => {
    let loaded = 0
    const graph = { isPersistenceEnabled: () => true, exportNodes: async () => { loaded++; return { items: [{ id: 'neo-user', nodeType: 'USER', properties: {} }], truncated: false } }, exportRelationships: async () => ({ items: [], truncated: false }) }
    const service = new PipelineService(undefined, graph as any)
    await service.next()
    assert.strictEqual(loaded, 1)
    assert.strictEqual(service.getSnapshots()[0].output.metadata.source, 'neo4j')
  })

  it('should reject truncated graph snapshots', async () => {
    const graph = { isPersistenceEnabled: () => true, exportNodes: async () => ({ items: [], truncated: true }), exportRelationships: async () => ({ items: [], truncated: false }) }
    await assert.rejects(() => new PipelineService(undefined, graph as any).start(), /50,000-record pipeline snapshot limit/)
  })

  it('should fail closed without Neo4j', async () => {
    const service = new PipelineService()
    assert.deepStrictEqual(service.getInputStatus(), {
      ready: false,
      source: 'unavailable',
      productionSafe: false,
      message: 'Neo4j must be enabled before pipeline runs can start.',
    })
    await assert.rejects(() => service.start(), /Neo4j is disabled/)
    await assert.rejects(() => service.next(), /Neo4j is disabled/)
  })

  it('should discard reset input and reload the latest authoritative graph', async () => {
    let revision = 0
    const graph = { isPersistenceEnabled: () => true, exportNodes: async () => ({ items: [{ id: `node-${++revision}`, nodeType: 'USER', properties: {} }], truncated: false }), exportRelationships: async () => ({ items: [], truncated: false }) }
    const service = new PipelineService(undefined, graph as any)
    await service.next()
    service.reset()
    await service.next()
    assert.strictEqual(revision, 2)
    assert.strictEqual(service.getSnapshots()[0].output.nodes[0].id, 'node-2')
  })

  it('should not acknowledge a pipeline mutation when PostgreSQL persistence fails', async () => {
    const store = { savePipeline: () => undefined, flush: async () => { throw new Error('database write failed') } }
    const service = new PipelineService(store as any)
    await assert.rejects(() => service.reset(), /database write failed/)
  })

  it('should support next/previous step-by-step with Neo4j', async () => {
    const service = new PipelineService(undefined, mockGraphEmpty as any)
    const n1 = await service.next()
    assert.ok(n1)
    const n2 = await service.next()
    assert.ok(n2)
    const p = await service.previous()
    assert.ok(p)
  })
})
