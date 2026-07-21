import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PipelineController } from '../pipeline.controller'
import { PipelineService } from '../pipeline.service'

describe('PipelineController', () => {
  it('should return state on GET /pipeline/state', () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    const state = controller.getState()
    assert.ok(state)
    assert.strictEqual(typeof state.status, 'string')
  })

  it('should return snapshots on GET /pipeline/snapshots', () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    const snapshots = controller.getSnapshots()
    assert.ok(Array.isArray(snapshots))
  })

  it('should report imported input source without Neo4j', () => {
    const controller = new PipelineController(new PipelineService())
    assert.strictEqual(controller.getInputStatus().source, 'imported')
  })

  it('should run with imported graph when Neo4j is disabled', async () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    const result = await controller.start()
    assert.strictEqual(result.status, 'COMPLETED')
  })

  it('should reset pipeline on POST /pipeline/reset', async () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    await controller.reset()
    const state = controller.getState()
    assert.strictEqual(state.status, 'IDLE')
  })
})
