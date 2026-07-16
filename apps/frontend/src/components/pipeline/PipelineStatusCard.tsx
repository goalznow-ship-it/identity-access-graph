import { Badge } from '../ui/Badge'
import { ProgressBar } from '../ui/ProgressBar'
import { Card } from '../ui/Card'
import type { PipelineRun } from '../../types/pipeline'

interface PipelineStatusCardProps {
  state: PipelineRun | null
}

const statusBadge: Record<string, { variant: 'primary' | 'success' | 'warning' | 'danger'; label: string }> = {
  IDLE: { variant: 'primary', label: 'Idle' },
  RUNNING: { variant: 'primary', label: 'Running' },
  PAUSED: { variant: 'warning', label: 'Paused' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  FAILED: { variant: 'danger', label: 'Failed' },
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString()
}

export function PipelineStatusCard({ state }: PipelineStatusCardProps) {
  if (!state) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No pipeline state loaded.</p>
      </Card>
    )
  }

  const badge = statusBadge[state.status] ?? statusBadge.IDLE

  return (
    <Card className="divide-y divide-border">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">Status</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>Progress</span>
            <span>{state.progress}%</span>
          </div>
          <ProgressBar
            value={state.progress}
            variant={state.status === 'FAILED' ? 'danger' : 'primary'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Current Stage</span>
            <p className="mt-0.5 font-medium text-gray-200">
              {state.currentStage ?? '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Completed</span>
            <p className="mt-0.5 font-medium text-gray-200">
              {state.completedStages.length} stages
            </p>
          </div>
          <div>
            <span className="text-gray-500">Started</span>
            <p className="mt-0.5 font-medium text-gray-200">
              {formatTime(state.startedAt)}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Completed</span>
            <p className="mt-0.5 font-medium text-gray-200">
              {formatTime(state.completedAt)}
            </p>
          </div>
        </div>
      </div>

      {(state.warnings.length > 0 || state.errors.length > 0) && (
        <div className="space-y-2 p-5">
          {state.warnings.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-warning">Warnings</p>
              {state.warnings.map((w, i) => (
                <p key={i} className="text-xs text-gray-400">
                  {w}
                </p>
              ))}
            </div>
          )}
          {state.errors.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-danger">Errors</p>
              {state.errors.map((e, i) => (
                <p key={i} className="text-xs text-danger/80">
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
