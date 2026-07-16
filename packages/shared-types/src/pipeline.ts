export enum PipelineStage {
  Extraction = 'EXTRACTION',
  Normalization = 'NORMALIZATION',
  IdentityMatching = 'IDENTITY_MATCHING',
  GraphBuild = 'GRAPH_BUILD',
  Scheduling = 'SCHEDULING',
}

export const PIPELINE_STAGES_ORDER: PipelineStage[] = [
  PipelineStage.Extraction,
  PipelineStage.Normalization,
  PipelineStage.IdentityMatching,
  PipelineStage.GraphBuild,
  PipelineStage.Scheduling,
]

export enum PipelineStatus {
  Idle = 'IDLE',
  Running = 'RUNNING',
  Paused = 'PAUSED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

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
  metrics: Record<string, unknown>
}
