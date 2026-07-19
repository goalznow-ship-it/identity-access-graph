import {
  PipelineStage,
  PipelineStatus,
  PIPELINE_STAGES_ORDER,
} from '../../../../packages/shared-types/src'
import type { PipelineRun, StageResult } from '../../../../packages/shared-types/src'
export type { StageInput, StageOutput } from './stages'
import { stageHandlers, type StageInput, type StageOutput } from './stages'

export interface PipelineConfig {
  stageTimeoutMs: number
  idleDelayMs: number
}

const DEFAULT_CONFIG: PipelineConfig = {
  stageTimeoutMs: 5000,
  idleDelayMs: 50,
}

export interface StageSnapshot {
  stage: PipelineStage
  result: StageResult
  output: StageOutput
}

export class PipelineEngine {
  private run: PipelineRun
  private config: PipelineConfig
  private snapshots: StageSnapshot[] = []
  private currentOutput: StageOutput | null = null
  private initialInput: StageInput | null = null
  private timerId: ReturnType<typeof setTimeout> | null = null
  private executionId = 0

  constructor(config?: Partial<PipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.run = this.createInitialRun()
  }

  private createInitialRun(): PipelineRun {
    return {
      id: crypto.randomUUID(),
      status: PipelineStatus.Idle,
      currentStage: null,
      completedStages: [],
      startedAt: null,
      completedAt: null,
      progress: 0,
      errors: [],
      warnings: [],
      metrics: {},
    }
  }

  async start(initialData: StageInput): Promise<PipelineRun> {
    if (this.run.status === PipelineStatus.Running) {
      throw new Error('Pipeline is already running')
    }

    this.executionId++
    this.run.status = PipelineStatus.Running
    this.run.startedAt = new Date().toISOString()
    this.run.currentStage = PIPELINE_STAGES_ORDER[0]
    this.run.progress = 0
    this.run.errors = []
    this.run.warnings = []
    this.snapshots = []
    this.initialInput = initialData
    this.currentOutput = initialData

    return this.executeRemainingStages(0)
  }

  private async executeRemainingStages(fromIndex: number): Promise<PipelineRun> {
    const id = this.executionId

    for (let i = fromIndex; i < PIPELINE_STAGES_ORDER.length; i++) {
      if (this.executionId !== id) break
      if (this.run.status === PipelineStatus.Paused) {
        this.run.currentStage = PIPELINE_STAGES_ORDER[i]
        return this.run
      }

      if (this.run.status !== PipelineStatus.Running) break

      const stage = PIPELINE_STAGES_ORDER[i]

      if (this.run.completedStages.includes(stage)) continue

      this.run.currentStage = stage
      this.run.progress = Math.round((i / PIPELINE_STAGES_ORDER.length) * 100)

      await this.delay(this.config.idleDelayMs)

      const handler = stageHandlers[stage]
      const input: StageInput = this.currentOutput!

      let result: StageResult & { output: StageOutput }
      try {
        result = await this.runStage(handler(input, stage), stage)
      } catch (err) {
        this.run.status = PipelineStatus.Failed
        this.run.errors.push(`Stage ${stage} threw: ${(err as Error).message}`)
        this.run.completedAt = new Date().toISOString()
        this.run.currentStage = stage
        return this.run
      }

      this.snapshots.push({ stage, result, output: result.output })

      if (result.errors.length > 0) {
        this.run.errors.push(...result.errors.map((e) => `[${stage}] ${e}`))
      }
      if (result.warnings.length > 0) {
        this.run.warnings.push(...result.warnings.map((w) => `[${stage}] ${w}`))
      }

      if (result.status === PipelineStatus.Failed) {
        this.run.status = PipelineStatus.Failed
        this.run.currentStage = stage
        this.run.completedAt = new Date().toISOString()
        this.run.progress = Math.round(((i + 1) / PIPELINE_STAGES_ORDER.length) * 100)
        return this.run
      }

      this.run.completedStages.push(stage)
      this.currentOutput = result.output
      this.run.metrics[stage] = {
        durationMs: result.durationMs,
        inputCount: result.inputCount,
        outputCount: result.outputCount,
        warnings: result.warnings.length,
        errors: result.errors.length,
      }
    }

    this.run.status = PipelineStatus.Completed
    this.run.currentStage = null
    this.run.completedAt = new Date().toISOString()
    this.run.progress = 100
    return this.run
  }

  async pause(): Promise<PipelineRun> {
    if (this.run.status !== PipelineStatus.Running) {
      throw new Error('Can only pause a running pipeline')
    }
    this.run.status = PipelineStatus.Paused
    return this.run
  }

  async resume(): Promise<PipelineRun> {
    if (this.run.status !== PipelineStatus.Paused) {
      throw new Error('Can only resume a paused pipeline')
    }
    if (!this.run.currentStage) {
      throw new Error('No stage to resume from')
    }

    this.executionId++
    this.run.status = PipelineStatus.Running
    const resumeIndex = PIPELINE_STAGES_ORDER.indexOf(this.run.currentStage)
    return this.executeRemainingStages(resumeIndex)
  }

  seed(data: StageInput): void {
    this.initialInput = data
    this.currentOutput = data
  }

  async nextStage(): Promise<StageSnapshot | null> {
    if (this.run.status !== PipelineStatus.Idle && this.run.status !== PipelineStatus.Completed) {
      throw new Error('nextStage requires IDLE or COMPLETED status')
    }

    const startIndex = this.run.completedStages.length
    if (startIndex >= PIPELINE_STAGES_ORDER.length) return null

    this.executionId++
    this.run.status = PipelineStatus.Running
    this.run.startedAt = new Date().toISOString()
    this.run.currentStage = PIPELINE_STAGES_ORDER[startIndex]
    if (!this.currentOutput) {
      throw new Error('No data seeded. Call seed() or start() first.')
    }

    const handler = stageHandlers[PIPELINE_STAGES_ORDER[startIndex]]
    const input: StageInput = this.currentOutput!
    const result = await this.runStage(handler(input, PIPELINE_STAGES_ORDER[startIndex]), PIPELINE_STAGES_ORDER[startIndex])

    this.snapshots.push({ stage: PIPELINE_STAGES_ORDER[startIndex], result, output: result.output })
    this.run.completedStages.push(PIPELINE_STAGES_ORDER[startIndex])
    this.currentOutput = result.output

    if (result.errors.length > 0) {
      this.run.errors.push(...result.errors.map((e) => `[${PIPELINE_STAGES_ORDER[startIndex]}] ${e}`))
    }
    if (result.warnings.length > 0) {
      this.run.warnings.push(...result.warnings.map((w) => `[${PIPELINE_STAGES_ORDER[startIndex]}] ${w}`))
    }

    if (result.status === PipelineStatus.Failed) {
      this.run.status = PipelineStatus.Failed
    } else if (this.run.completedStages.length >= PIPELINE_STAGES_ORDER.length) {
      this.run.status = PipelineStatus.Completed
      this.run.completedAt = new Date().toISOString()
      this.run.currentStage = null
    } else {
      this.run.status = PipelineStatus.Idle
      this.run.currentStage = PIPELINE_STAGES_ORDER[startIndex + 1] ?? null
    }

    this.run.progress = Math.round((this.run.completedStages.length / PIPELINE_STAGES_ORDER.length) * 100)
    return this.snapshots[this.snapshots.length - 1]
  }

  async previousStage(): Promise<StageSnapshot | null> {
    if (this.run.completedStages.length === 0) return null

    this.snapshots.pop()
    const prevStage = this.run.completedStages.pop()
    this.currentOutput = this.snapshots.length > 0
      ? this.snapshots[this.snapshots.length - 1].output
      : this.initialInput

    this.run.currentStage = prevStage ?? PIPELINE_STAGES_ORDER[0]
    this.run.progress = Math.round((this.run.completedStages.length / PIPELINE_STAGES_ORDER.length) * 100)
    this.run.status = PipelineStatus.Idle
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null
  }

  async replay(): Promise<PipelineRun> {
    if (this.run.completedStages.length === 0) {
      throw new Error('No completed stages to replay')
    }
    if (!this.initialInput) {
      throw new Error('No initial data to replay from')
    }

    const initialInput = this.initialInput
    this.reset()
    return this.start(initialInput)
  }

  reset(): void {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.executionId = 0
    this.run = this.createInitialRun()
    this.snapshots = []
    this.currentOutput = null
    this.initialInput = null
  }

  getState(): PipelineRun {
    return { ...this.run }
  }

  getSnapshots(): StageSnapshot[] {
    return [...this.snapshots]
  }

  persistenceState() {
    return { run: this.run, snapshots: this.snapshots, currentOutput: this.currentOutput, initialInput: this.initialInput }
  }

  restore(state: { run: PipelineRun; snapshots: StageSnapshot[]; currentOutput: StageOutput | null; initialInput: StageInput | null }): void {
    this.run = state.run
    this.snapshots = state.snapshots
    this.currentOutput = state.currentOutput
    this.initialInput = state.initialInput
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timerId = setTimeout(resolve, ms)
    })
  }

  private runStage<T>(stagePromise: Promise<T>, stage: PipelineStage): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Stage ${stage} timed out after ${this.config.stageTimeoutMs}ms`)), this.config.stageTimeoutMs)
    })
    return Promise.race([stagePromise, timeout]).finally(() => clearTimeout(timeoutId))
  }
}
