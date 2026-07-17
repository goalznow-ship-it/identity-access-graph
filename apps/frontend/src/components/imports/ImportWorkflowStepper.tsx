import { CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react'

export type WorkflowStepId =
  | 'upload' | 'inspect' | 'map' | 'validate'
  | 'correlate' | 'graphPreview' | 'persist' | 'complete'

interface WorkflowStep {
  id: WorkflowStepId
  label: string
  description: string
}

const STEPS: WorkflowStep[] = [
  { id: 'upload', label: 'Upload', description: 'Select & upload files' },
  { id: 'inspect', label: 'Inspect', description: 'Classify sheets' },
  { id: 'map', label: 'Map', description: 'Map columns' },
  { id: 'validate', label: 'Validate', description: 'Validate data' },
  { id: 'correlate', label: 'Correlate', description: 'Match identities' },
  { id: 'graphPreview', label: 'Graph', description: 'Preview graph' },
  { id: 'persist', label: 'Persist', description: 'Save to Neo4j' },
  { id: 'complete', label: 'Complete', description: 'Done' },
]

const STEP_ORDER: WorkflowStepId[] = STEPS.map((s) => s.id)

export function getStepIndex(id: WorkflowStepId): number {
  return STEP_ORDER.indexOf(id)
}

export function isStepAccessible(
  currentId: WorkflowStepId,
  targetId: WorkflowStepId,
  completedSteps: Set<WorkflowStepId>,
): boolean {
  const currentIdx = getStepIndex(currentId)
  const targetIdx = getStepIndex(targetId)
  if (targetIdx <= currentIdx) return true
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (completedSteps.has(STEP_ORDER[i])) return true
  }
  return false
}

export function getNextStep(currentId: WorkflowStepId): WorkflowStepId | null {
  const idx = getStepIndex(currentId)
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null
}

interface ImportWorkflowStepperProps {
  currentStep: WorkflowStepId
  completedSteps: Set<WorkflowStepId>
  blockedReason?: string
  onStepClick: (step: WorkflowStepId) => void
}

export function ImportWorkflowStepper({
  currentStep,
  completedSteps,
  blockedReason,
  onStepClick,
}: ImportWorkflowStepperProps) {
  return (
    <div className="space-y-2">
      <nav className="flex items-center gap-0 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {STEPS.map((step, i) => {
          const isCurrent = step.id === currentStep
          const isCompleted = completedSteps.has(step.id)
          const isBlocked = step.id !== currentStep && !isCompleted && !isStepAccessible(currentStep, step.id, completedSteps)

          return (
            <button
              key={step.id}
              onClick={() => !isBlocked && onStepClick(step.id)}
              disabled={isBlocked}
              className={`
                group relative flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors
                ${isCurrent ? 'bg-primary text-white shadow-sm' : ''}
                ${isCompleted && !isCurrent ? 'text-gray-300 hover:bg-gray-800' : ''}
                ${!isCurrent && !isCompleted && !isBlocked ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-300' : ''}
                ${isBlocked ? 'cursor-not-allowed text-gray-600' : ''}
              `}
            >
              {isCompleted ? (
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-400" />
              ) : isCurrent ? (
                <Clock className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{i + 1}. {step.label}</span>
              {isBlocked && (
                <AlertTriangle className="h-3 w-3 shrink-0 text-gray-600" />
              )}
              {i < STEPS.length - 1 && (
                <div className="ml-2 h-px flex-1 bg-gray-700" />
              )}
            </button>
          )
        })}
      </nav>
      {blockedReason && (
        <p className="flex items-center gap-1 text-xs text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          {blockedReason}
        </p>
      )}
    </div>
  )
}
