import { motion } from 'framer-motion'
import { Check, X, AlertTriangle } from 'lucide-react'
import { Card } from '../ui/Card'
import type { StageSnapshot, PipelineStage } from '../../types/pipeline'

interface SnapshotTimelineProps {
  snapshots: StageSnapshot[]
}

const stageLabels: Record<PipelineStage, string> = {
  EXTRACTION: 'Extraction',
  NORMALIZATION: 'Normalization',
  IDENTITY_MATCHING: 'Identity Matching',
  GRAPH_BUILD: 'Graph Build',
  SCHEDULING: 'Scheduling',
}

export function SnapshotTimeline({ snapshots }: SnapshotTimelineProps) {
  if (snapshots.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No snapshots yet.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {snapshots.map((snap, i) => {
        const result = snap.result
        const failed = result.status === 'FAILED'

        return (
          <motion.div
            key={snap.stage + i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {failed ? (
                    <X className="h-5 w-5 text-danger" />
                  ) : result.warnings.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  ) : (
                    <Check className="h-5 w-5 text-success" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-200">
                      {stageLabels[snap.stage] ?? snap.stage}
                    </span>
                    <span className="text-xs text-gray-500">{result.durationMs}ms</span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-gray-500">
                    <span>In: {result.inputCount}</span>
                    <span>Out: {result.outputCount}</span>
                  </div>
                  {result.warnings.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {result.warnings.map((w, j) => (
                        <p key={j} className="text-xs text-warning/80">
                          {w}
                        </p>
                      ))}
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {result.errors.map((e, j) => (
                        <p key={j} className="text-xs text-danger/80">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
