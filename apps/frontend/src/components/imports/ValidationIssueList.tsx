import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, ChevronRight, ChevronUp, AlertCircle as AlertCircleIcon } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import type { ValidationIssue } from '../../types/import'

interface ValidationIssueListProps {
  issues: ValidationIssue[]
  filter?: 'all' | 'info' | 'warning' | 'error' | 'critical'
  onFilterChange?: (filter: 'all' | 'info' | 'warning' | 'error' | 'critical') => void
  maxRows?: number
}

const SEVERITY_ICONS = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  CRITICAL: AlertCircleIcon,
}

const SEVERITY_COLORS = {
  INFO: 'blue',
  WARNING: 'yellow',
  ERROR: 'red',
  CRITICAL: 'red',
}

const SEVERITY_BADGE = {
  INFO: 'info' as const,
  WARNING: 'warning' as const,
  ERROR: 'danger' as const,
  CRITICAL: 'danger' as const,
}

export function ValidationIssueList({ issues, filter = 'all', onFilterChange, maxRows = 50 }: ValidationIssueListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const filteredIssues = issues.filter((i) => filter === 'all' || i.severity === filter.toUpperCase())

  const counts = {
    all: issues.length,
    info: issues.filter((i) => i.severity === 'INFO').length,
    warning: issues.filter((i) => i.severity === 'WARNING').length,
    error: issues.filter((i) => i.severity === 'ERROR').length,
    critical: issues.filter((i) => i.severity === 'CRITICAL').length,
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-green-800 bg-green-900/20 p-4 text-center">
        <Info className="h-6 w-6 mx-auto text-green-400 mb-2" />
        <p className="text-sm text-green-300">No validation issues found</p>
      </div>
    )
  }

  const displayIssues = filteredIssues.slice(0, maxRows)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(['all', 'info', 'warning', 'error', 'critical'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange?.(f)}
            className={`px-3 py-1 text-xs rounded ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {displayIssues.map((issue, idx) => {
          const Icon = SEVERITY_ICONS[issue.severity]
          const color = SEVERITY_COLORS[issue.severity]
          const badgeVariant = SEVERITY_BADGE[issue.severity]
          const issueKey = `${issue.code}-${issue.row}-${issue.sourceColumn}-${idx}`

          return (
            <motion.div
              key={issueKey}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-lg border p-3 ${
                color === 'red' ? 'border-red-800 bg-red-900/20' :
                color === 'yellow' ? 'border-yellow-800 bg-yellow-900/20' :
                'border-blue-800 bg-blue-900/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 text-${color}-400 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-300">{issue.code}</span>
                    <Badge variant={badgeVariant}>{issue.severity}</Badge>
                    <span className="text-xs text-gray-500">Row {issue.row || 'N/A'}</span>
                    {issue.sourceColumn && (
                      <span className="text-xs text-gray-500 font-mono">{issue.sourceColumn}</span>
                    )}
                    {issue.targetField && issue.targetField !== issue.sourceColumn && (
                      <span className="text-xs text-gray-500">→ {issue.targetField}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-200">{issue.message}</p>
                  {issue.rawValue && (
                    <p className="mt-1 text-xs text-gray-500 font-mono">
                      Value: <span className="text-gray-300">{issue.rawValue}</span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{issue.suggestedResolution}</p>
                </div>
                <button
                  onClick={() => setExpanded(expanded === issueKey ? null : issueKey)}
                  className="flex-shrink-0 text-gray-500 hover:text-gray-300"
                >
                  {expanded === issueKey ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>

              <AnimatePresence>
                {expanded === issueKey && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-gray-700 space-y-2 text-xs"
                  >
                    <div className="grid grid-cols-2 gap-2 text-gray-500">
                      <div><span className="font-medium">File:</span> {issue.file}</div>
                      <div><span className="font-medium">Sheet:</span> {issue.sheet}</div>
                      <div><span className="font-medium">Row:</span> {issue.row}</div>
                      <div><span className="font-medium">Source Column:</span> {issue.sourceColumn || '—'}</div>
                      <div><span className="font-medium">Target Field:</span> {issue.targetField || '—'}</div>
                      <div><span className="font-medium">Raw Value:</span> {issue.rawValue || '—'}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}

        {filteredIssues.length > maxRows && (
          <div className="text-center text-xs text-gray-500 py-2">
            Showing {maxRows} of {filteredIssues.length} issues. Apply filters to narrow down.
          </div>
        )}
      </div>
    </div>
  )
}
