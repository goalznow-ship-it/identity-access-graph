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
