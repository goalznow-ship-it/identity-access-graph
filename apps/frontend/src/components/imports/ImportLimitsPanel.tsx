import type { ImportLimits } from '../../types/import'

interface ImportLimitsPanelProps {
  limits: ImportLimits
}

export function ImportLimitsPanel({ limits }: ImportLimitsPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs text-gray-400">
      <p className="mb-1.5 font-medium text-gray-300">Import Limits</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Max file size</span>
        <span className="text-right text-gray-200">{limits.maxFileSizeMb} MB</span>
        <span>Max files per session</span>
        <span className="text-right text-gray-200">{limits.maxFilesPerSession}</span>
        <span>Max rows per sheet</span>
        <span className="text-right text-gray-200">{limits.maxRowsPerSheet.toLocaleString()}</span>
        <span>Preview rows</span>
        <span className="text-right text-gray-200">{limits.previewRows}</span>
        <span>Session timeout</span>
        <span className="text-right text-gray-200">{limits.sessionTtlMinutes} min</span>
      </div>
    </div>
  )
}
