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

  it('should return snapshots on GET /pipeline/snapshots', async () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    await service.start()
    const snapshots = controller.getSnapshots()
    assert.ok(Array.isArray(snapshots))
    assert.ok(snapshots.length > 0)
  })

  it('should expose the active input source', () => {
    const controller = new PipelineController(new PipelineService())
    assert.strictEqual(controller.getInputStatus().source, 'demo')
  })

  it('should start and complete pipeline on POST /pipeline/start', async () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    const result = await controller.start()
    assert.strictEqual(result.status, 'COMPLETED')
  })

  it('should reset pipeline on POST /pipeline/reset', () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    controller.reset()
    const state = controller.getState()
    assert.strictEqual(state.status, 'IDLE')
  })

  it('should support next/previous via controller', async () => {
    const service = new PipelineService()
    const controller = new PipelineController(service)
    const n1 = await controller.next()
    assert.ok(n1)
    const n2 = await controller.next()
    assert.ok(n2)
    const p = await controller.previous()
    assert.ok(p)
  })
})
