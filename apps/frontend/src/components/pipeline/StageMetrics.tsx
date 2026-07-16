import { Card } from '../ui/Card'
import type { PipelineRun, PipelineStage } from '../../types/pipeline'

interface StageMetricsProps {
  state: PipelineRun | null
}

const stageLabels: Record<PipelineStage, string> = {
  EXTRACTION: 'Extraction',
  NORMALIZATION: 'Normalization',
  IDENTITY_MATCHING: 'Identity Matching',
  GRAPH_BUILD: 'Graph Build',
  SCHEDULING: 'Scheduling',
}

export function StageMetrics({ state }: StageMetricsProps) {
  const metrics = state?.metrics ?? {}
  const entries = Object.entries(metrics) as [PipelineStage, import('../../types/pipeline').StageMetrics][]

  if (entries.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No stages completed yet.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map(([stage, m]) => (
        <Card key={stage} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-200">
              {stageLabels[stage] ?? stage}
            </span>
            {m.errors > 0 && (
              <span className="text-xs text-danger">{m.errors} errors</span>
            )}
            {m.warnings > 0 && (
              <span className="text-xs text-warning">{m.warnings} warnings</span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Input</span>
              <p className="mt-0.5 font-medium text-gray-200">{m.inputCount.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Output</span>
              <p className="mt-0.5 font-medium text-gray-200">{m.outputCount.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Duration</span>
              <p className="mt-0.5 font-medium text-gray-200">{m.durationMs}ms</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
