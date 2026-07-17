import { CheckCircle, ExternalLink, ChevronRight, BarChart3 } from 'lucide-react'
import { Button } from '../ui/Button'
import type { ImportPersistenceSummary } from '../../types/import'
import type { WorkflowStepId } from './ImportWorkflowStepper'

interface ImportCompleteProps {
  importId: string
  persistenceSummary?: ImportPersistenceSummary | null
  onNavigate: (step: WorkflowStepId) => void
}

export function ImportComplete({ importId, persistenceSummary, onNavigate }: ImportCompleteProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="rounded-full bg-green-900/30 p-4">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Import Complete</h2>
          <p className="text-sm text-gray-500">
            All files have been processed, converted, and persisted to the graph database.
          </p>
        </div>
      </div>

      {persistenceSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xl font-bold text-green-400">{persistenceSummary.nodesUpserted.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 uppercase">Nodes Created</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xl font-bold text-blue-400">{persistenceSummary.relationshipsUpserted.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 uppercase">Relationships</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xl font-bold text-gray-300">{persistenceSummary.skipped.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 uppercase">Skipped</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">{persistenceSummary.conflicts.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 uppercase">Conflicts</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => window.open(`/graph?importId=${importId}`, '_blank')}
          className="inline-flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Graph Explorer
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.open(`/risk`, '_blank')}
          className="inline-flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          View Risk Findings
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate('graphPreview')}
          className="inline-flex items-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          Back to Graph Preview
        </Button>
      </div>
    </div>
  )
}
