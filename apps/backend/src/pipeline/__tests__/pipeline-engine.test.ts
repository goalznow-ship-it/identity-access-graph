import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { PipelineEngine, type StageInput } from '../pipeline-engine'
import { PipelineStatus, PipelineStage, PIPELINE_STAGES_ORDER } from '../../../../../packages/shared-types/src'

function makeInput(overrides?: Partial<StageInput>): StageInput {
  return {
    nodes: [
      { id: 'user-001', displayName: 'Alice', nodeType: 'USER', sourceSystem: 'ACTIVE_DIRECTORY', sourceId: 'ad-alice', email: 'alice@corp.com', principalName: 'alice@CORP' },
      { id: 'user-002', displayName: 'Bob', nodeType: 'USER', sourceSystem: 'FREE_IPA', sourceId: 'ad-bob', email: 'bob@linux.io', principalName: 'bob@LINUX' },
      { id: 'group-001', displayName: 'Admins', nodeType: 'GROUP', sourceSystem: 'ACTIVE_DIRECTORY' },
      { id: 'computer-001', displayName: 'SRV01', nodeType: 'COMPUTER', sourceSystem: 'ACTIVE_DIRECTORY' },
    ],
    relationships: [
      { id: 'rel-1', relationshipType: 'MEMBER_OF', sourceNodeId: 'user-001', targetNodeId: 'group-001' },
      { id: 'rel-2', relationshipType: 'BELONGS_TO', sourceNodeId: 'user-002', targetNodeId: 'user-001' },
    ],
    metadata: { source: 'test' },
    ...overrides,
  }
}

describe('PipelineEngine', () => {
  it('should complete a full pipeline run successfully', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 5 })
    const result = await engine.start(makeInput())

    assert.strictEqual(result.status, PipelineStatus.Completed)
    assert.strictEqual(result.completedStages.length, 5)
    assert.strictEqual(result.progress, 100)
    assert.strictEqual(result.errors.length, 0)
    assert.ok(result.startedAt)
    assert.ok(result.completedAt)
  })

  it('should support nextStage step-by-step', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 5 })
    engine.seed(makeInput())

    const s1 = await engine.nextStage()
    assert.ok(s1)
    assert.strictEqual(s1!.stage, PipelineStage.Extraction)
    assert.strictEqual(engine.getState().completedStages.length, 1)
    assert.strictEqual(engine.getState().status, PipelineStatus.Idle)

    const s2 = await engine.nextStage()
    assert.ok(s2)
    assert.strictEqual(s2!.stage, PipelineStage.Normalization)
    assert.strictEqual(engine.getState().completedStages.length, 2)

    const s3 = await engine.nextStage()
    assert.ok(s3)
    assert.strictEqual(s3!.stage, PipelineStage.IdentityMatching)

    const s4 = await engine.nextStage()
    assert.ok(s4)
    assert.strictEqual(s4!.stage, PipelineStage.GraphBuild)

    const s5 = await engine.nextStage()
    assert.ok(s5)
    assert.strictEqual(s5!.stage, PipelineStage.Scheduling)

    const final = engine.getState()
    assert.strictEqual(final.status, PipelineStatus.Completed)
    assert.strictEqual(final.completedStages.length, 5)
  })

  it('should support previousStage (step back)', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 5 })
    engine.seed(makeInput())

    await engine.nextStage()
    await engine.nextStage()
    await engine.nextStage()
    assert.strictEqual(engine.getState().completedStages.length, 3)

    const prev = await engine.previousStage()
    assert.ok(prev)
    assert.strictEqual(engine.getState().completedStages.length, 2)
    assert.strictEqual(engine.getState().status, PipelineStatus.Idle)

    const prev2 = await engine.previousStage()
    assert.ok(prev2)
    assert.strictEqual(engine.getState().completedStages.length, 1)

    const prev3 = await engine.previousStage()
    assert.strictEqual(engine.getState().completedStages.length, 0)

    const prev4 = await engine.previousStage()
    assert.strictEqual(prev4, null)
  })

  it('should support replay', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 5 })
    engine.seed(makeInput())

    await engine.nextStage()
    await engine.nextStage()
    await engine.nextStage()
    const originalSnapshots = engine.getSnapshots().length

    const replayed = await engine.replay()
    assert.strictEqual(replayed.status, PipelineStatus.Completed)
    assert.strictEqual(replayed.completedStages.length, 5)
    assert.ok(engine.getSnapshots().length >= originalSnapshots)
  })

  it('should restore the original input when stepping back to the first stage', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 0 })
    const input = makeInput()
    engine.seed(input)
    await engine.nextStage()
    await engine.previousStage()
    const extraction = await engine.nextStage()
    assert.strictEqual(extraction?.result.inputCount, input.nodes.length)
  })

  it('should fail validation on missing target nodes', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 5 })

    const badInput = makeInput()
    badInput.relationships.push({
      id: 'rel-bad',
      relationshipType: 'MEMBER_OF',
      sourceNodeId: 'user-001',
      targetNodeId: 'nonexistent-node',
    } as any)

    const result = await engine.start(badInput)
    assert.strictEqual(result.status, PipelineStatus.Failed)
    assert.ok(result.errors.length > 0)
    assert.ok(result.errors[0].includes('nonexistent-node'))
  })

  it('should support reset', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 5 })

    await engine.start(makeInput())
    assert.strictEqual(engine.getState().status, PipelineStatus.Completed)

    engine.reset()
    const state = engine.getState()
    assert.strictEqual(state.status, PipelineStatus.Idle)
    assert.strictEqual(state.completedStages.length, 0)
    assert.strictEqual(state.progress, 0)
    assert.strictEqual(engine.getSnapshots().length, 0)
  })

  it('should reject invalid pause/resume transitions', async () => {
    const engine = new PipelineEngine({ idleDelayMs: 5 })
    await assert.rejects(() => engine.pause(), { message: 'Can only pause a running pipeline' })
    await assert.rejects(() => engine.resume(), { message: 'Can only resume a paused pipeline' })

    engine.seed(makeInput())
    await engine.nextStage()
    await assert.rejects(() => engine.pause(), { message: 'Can only pause a running pipeline' })
  })
})
