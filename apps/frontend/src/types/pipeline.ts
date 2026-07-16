export const PIPELINE_STAGES = [
  'EXTRACTION',
  'NORMALIZATION',
  'IDENTITY_MATCHING',
  'GRAPH_BUILD',
  'SCHEDULING',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export type PipelineStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'

export interface StageResult {
  stage: PipelineStage
  status: PipelineStatus
  inputCount: number
  outputCount: number
  durationMs: number
  warnings: string[]
  errors: string[]
  metadata: Record<string, unknown>
}

export interface StageSnapshot {
  stage: PipelineStage
  result: StageResult
  output: Record<string, unknown>
}

export interface PipelineRun {
  id: string
  status: PipelineStatus
  currentStage: PipelineStage | null
  completedStages: PipelineStage[]
  startedAt: string | null
  completedAt: string | null
  progress: number
  errors: string[]
  warnings: string[]
  metrics: Record<string, StageMetrics>
}

export interface StageMetrics {
  durationMs: number
  inputCount: number
  outputCount: number
  warnings: number
  errors: number
}
