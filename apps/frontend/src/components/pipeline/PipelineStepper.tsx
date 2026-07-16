import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { PIPELINE_STAGES, type PipelineRun, type PipelineStage } from '../../types/pipeline'

interface PipelineStepperProps {
  state: PipelineRun | null
}

const stageLabels: Record<PipelineStage, string> = {
  EXTRACTION: 'Extraction',
  NORMALIZATION: 'Normalization',
  IDENTITY_MATCHING: 'Identity Matching',
  GRAPH_BUILD: 'Graph Build',
  SCHEDULING: 'Scheduling',
}

export function PipelineStepper({ state }: PipelineStepperProps) {
  const completed = state?.completedStages ?? []
  const current = state?.currentStage

  return (
    <div className="flex items-center justify-between">
      {PIPELINE_STAGES.map((stage, index) => {
        const isCompleted = completed.includes(stage)
        const isCurrent = current === stage

        return (
          <div key={stage} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={
                  isCurrent && state?.status === 'RUNNING'
                    ? { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.5 } }
                    : {}
                }
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'border-success bg-success-muted text-success'
                    : isCurrent
                      ? 'border-primary bg-primary-muted text-primary'
                      : 'border-border bg-card text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : isCurrent && state?.status === 'RUNNING' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  isCompleted
                    ? 'text-success'
                    : isCurrent
                      ? 'text-primary'
                      : 'text-gray-500'
                }`}
              >
                {stageLabels[stage]}
              </span>
            </div>
            {index < PIPELINE_STAGES.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 rounded transition-colors duration-300 ${
                  isCompleted ? 'bg-success' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
