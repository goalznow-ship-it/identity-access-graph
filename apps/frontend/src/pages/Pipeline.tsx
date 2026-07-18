import { motion, AnimatePresence } from 'framer-motion'
import { Section } from '../components/ui/Section'
import { Toast } from '../components/ui/Toast'
import { usePipeline } from '../hooks/usePipeline'
import {
  PipelineStepper,
  PipelineControls,
  PipelineStatusCard,
  StageMetrics,
  SnapshotTimeline,
} from '../components/pipeline'

export function PipelinePage() {
  const {
    state,
    snapshots,
    loading,
    toasts,
    removeToast,
    start,
    pause,
    resume,
    next,
    previous,
    replay,
    reset,
  } = usePipeline()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-8 pb-8"
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">Pipeline Operations</h1>
        <p className="mt-1 text-sm text-gray-400">
          Run and inspect the current identity-resolution pipeline. This workspace uses the built-in demonstration dataset until a persisted graph source is selected.
        </p>
      </div>

      <Section title="Pipeline Stages">
        <PipelineStepper state={state} />
      </Section>

      <Section title="Controls">
        <PipelineControls
          state={state}
          loading={loading}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onNext={next}
          onPrevious={previous}
          onReplay={replay}
          onReset={reset}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Current State">
          <PipelineStatusCard state={state} />
        </Section>

        <Section title="Stage Metrics">
          <StageMetrics state={state} />
        </Section>
      </div>

      <Section title="Snapshot Timeline">
        <SnapshotTimeline snapshots={snapshots} />
      </Section>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
            >
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
