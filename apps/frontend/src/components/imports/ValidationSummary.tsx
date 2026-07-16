import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'

interface ValidationSummaryProps {
  summary: {
    total: number
    info: number
    warning: number
    error: number
    critical: number
  } | null
  className?: string
}

export function ValidationSummary({ summary, className }: ValidationSummaryProps) {
  if (!summary || summary.total === 0) {
    return (
      <div className={`rounded-lg border border-green-800 bg-green-900/20 p-4 ${className || ''}`}>
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">No validation issues found</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">All mapped data passes validation rules.</p>
      </div>
    )
  }

  const hasErrors = summary.error > 0 || summary.critical > 0
  const hasWarnings = summary.warning > 0

  return (
    <div className={`rounded-lg border p-4 ${className || ''} ${hasErrors ? 'border-red-800 bg-red-900/20' : hasWarnings ? 'border-yellow-800 bg-yellow-900/20' : 'border-blue-800 bg-blue-900/20'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <XCircle className="h-5 w-5 text-red-400" />
          ) : hasWarnings ? (
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          ) : (
            <Info className="h-5 w-5 text-blue-400" />
          )}
          <span className="text-sm font-medium text-gray-100">
            {hasErrors ? 'Validation failed' : hasWarnings ? 'Validation passed with warnings' : 'Validation passed'}
          </span>
        </div>
        <Badge variant={hasErrors ? 'danger' : hasWarnings ? 'warning' : 'success'}>
          {summary.total} issue{summary.total !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg bg-gray-800/50 p-2">
          <div className="text-2xl font-bold text-red-400">{summary.critical}</div>
          <div className="text-[10px] text-gray-500 uppercase">Critical</div>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <div className="text-2xl font-bold text-red-400">{summary.error}</div>
          <div className="text-[10px] text-gray-500 uppercase">Error</div>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <div className="text-2xl font-bold text-yellow-400">{summary.warning}</div>
          <div className="text-[10px] text-gray-500 uppercase">Warning</div>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <div className="text-2xl font-bold text-blue-400">{summary.info}</div>
          <div className="text-[10px] text-gray-500 uppercase">Info</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {summary.critical > 0 && (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertCircle className="h-2.5 w-2.5" />
            {summary.critical} Critical
          </Badge>
        )}
        {summary.error > 0 && (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="h-2.5 w-2.5" />
            {summary.error} Error{summary.error !== 1 ? 's' : ''}
          </Badge>
        )}
        {summary.warning > 0 && (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" />
            {summary.warning} Warning{summary.warning !== 1 ? 's' : ''}
          </Badge>
        )}
        {summary.info > 0 && (
          <Badge variant="info" className="flex items-center gap-1">
            <Info className="h-2.5 w-2.5" />
            {summary.info} Info
          </Badge>
        )}
      </div>
    </div>
  )
}