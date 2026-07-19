import { Button } from '../ui/Button'
import type { PipelineRun } from '../../types/pipeline'

interface PipelineControlsProps {
  state: PipelineRun | null
  loading: Record<string, boolean>
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onNext: () => void
  onPrevious: () => void
  onReplay: () => void
  onReset: () => void
  inputReady?: boolean
}

export function PipelineControls({
  state,
  loading,
  onStart,
  onPause,
  onResume,
  onNext,
  onPrevious,
  onReplay,
  onReset,
  inputReady = true,
}: PipelineControlsProps) {
  const status = state?.status ?? 'IDLE'
  const hasStages = (state?.completedStages.length ?? 0) > 0
  const allComplete = status === 'COMPLETED'

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="primary"
        loading={loading['start']}
        disabled={!inputReady || status === 'RUNNING' || status === 'PAUSED'}
        onClick={onStart}
      >
        Start
      </Button>
      <Button
        variant="secondary"
        loading={loading['pause']}
        disabled={status !== 'RUNNING'}
        onClick={onPause}
      >
        Pause
      </Button>
      <Button
        variant="secondary"
        loading={loading['resume']}
        disabled={status !== 'PAUSED'}
        onClick={onResume}
      >
        Resume
      </Button>
      <Button
        variant="ghost"
        loading={loading['previous']}
        disabled={!hasStages || allComplete}
        onClick={onPrevious}
      >
        Previous
      </Button>
      <Button
        variant="ghost"
        loading={loading['next']}
        disabled={!inputReady || status === 'RUNNING' || allComplete}
        onClick={onNext}
      >
        Next
      </Button>
      <Button
        variant="ghost"
        loading={loading['replay']}
        disabled={!hasStages}
        onClick={onReplay}
      >
        Replay
      </Button>
      <Button
        variant="danger"
        loading={loading['reset']}
        disabled={!hasStages && status === 'IDLE'}
        onClick={onReset}
      >
        Reset
      </Button>
    </div>
  )
}
