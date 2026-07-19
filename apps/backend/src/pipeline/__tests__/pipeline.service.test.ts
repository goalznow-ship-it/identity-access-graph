import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { PipelineService } from '../pipeline.service'
import { PipelineStatus, PIPELINE_STAGES_ORDER } from '../../../../../packages/shared-types/src'

describe('PipelineService', () => {
  it('should start in idle state', () => {
    const service = new PipelineService()
    const state = service.getState()
    assert.strictEqual(state.status, PipelineStatus.Idle)
    assert.strictEqual(state.completedStages.length, 0)
  })

  it('should run full pipeline on start', async () => {
    const service = new PipelineService()
    const result = await service.start()
    assert.strictEqual(result.status, PipelineStatus.Completed)
    assert.strictEqual(result.completedStages.length, PIPELINE_STAGES_ORDER.length)
  })

  it('should load the authoritative Neo4j snapshot for each full run', async () => {
    const graph = {
      isPersistenceEnabled: () => true,
      exportNodes: async () => ({ items: [{ id: 'neo-user', nodeType: 'USER', properties: {} }], truncated: false }),
      exportRelationships: async () => ({ items: [{ relationship: { id: 'neo-edge', source: 'neo-user', target: 'neo-app', relationshipType: 'USES' } }], truncated: false }),
    }
    const service = new PipelineService(undefined, graph as any)
    await service.start()
    const first = service.getSnapshots()[0]
    assert.strictEqual(first.result.inputCount, 1)
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

  it('should fail closed without Neo4j when demonstration data is disabled', async () => {
    const config = { get: (key: string) => key === 'pipeline.allowDemoData' ? false : undefined }
    const service = new PipelineService(undefined, undefined, config as any)
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

  it('should support next/previous step-by-step', async () => {
    const service = new PipelineService()

    const s1 = await service.next()
    assert.ok(s1)
    assert.strictEqual(service.getState().status, PipelineStatus.Idle)

    const s2 = await service.next()
    assert.ok(s2)

    const prev = await service.previous()
    assert.ok(prev)
    assert.strictEqual(service.getState().completedStages.length, 1)
  })

  it('should support replay', async () => {
    const service = new PipelineService()
    await service.next()
    await service.next()
    await service.next()

    const replayed = await service.replay()
    assert.strictEqual(replayed.status, PipelineStatus.Completed)
  })

  it('should support reset', async () => {
    const service = new PipelineService()
    await service.start()
    service.reset()
    assert.strictEqual(service.getState().status, PipelineStatus.Idle)
    assert.strictEqual(service.getState().completedStages.length, 0)
  })

  it('should detect validation errors', async () => {
    const service = new PipelineService()
    const result = await service.start()
    if (result.status === PipelineStatus.Failed) {
      assert.ok(result.errors.length > 0)
    }
  })

  it('should return snapshots', async () => {
    const service = new PipelineService()
    await service.start()
    const snapshots = service.getSnapshots()
    assert.strictEqual(snapshots.length, PIPELINE_STAGES_ORDER.length)
  })
})
