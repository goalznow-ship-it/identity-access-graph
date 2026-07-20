import { CheckCircle, ExternalLink, Download, BarChart3 } from 'lucide-react'
import { Button } from '../ui/Button'
import type { ConversionResult, CorrelationResult, ImportPersistenceSummary, ImportSession } from '../../types/import'

interface ImportCompleteProps {
  importId: string
  persistenceSummary?: ImportPersistenceSummary | null
  session: ImportSession
  correlation?: CorrelationResult | null
  conversion?: ConversionResult | null
  onNewImport: () => void
}

export function ImportComplete({ importId, persistenceSummary, session, correlation, conversion, onNewImport }: ImportCompleteProps) {
  const rows = session.files.reduce((total, file) => total + file.sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0), 0)
  const warnings = session.files.reduce((total, file) => total + file.sheets.reduce((sum, sheet) => sum + sheet.warnings.length, 0), 0)
  const downloadReport = () => {
    const report = { importId, completedAt: new Date().toISOString(), files: session.files.map((file) => ({ name: file.originalName, rows: file.sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0), sheets: file.sheets.length })), rows, warnings, correlation: correlation?.summary, graph: conversion ? { nodes: conversion.nodesCreated, relationships: conversion.relationshipsCreated, unresolvedReferences: conversion.unresolvedReferences.length, conflicts: conversion.conflicts.length } : null, persistence: persistenceSummary }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `import-${importId}-report.json`; anchor.click(); URL.revokeObjectURL(url)
  }
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
        <div className="rounded border border-border p-3"><div className="text-lg text-gray-100">{session.files.length}</div><div className="text-xs text-gray-500">Files processed</div></div>
        <div className="rounded border border-border p-3"><div className="text-lg text-gray-100">{rows.toLocaleString()}</div><div className="text-xs text-gray-500">Rows processed</div></div>
        <div className="rounded border border-border p-3"><div className="text-lg text-gray-100">{correlation?.summary.identities.toLocaleString() ?? '—'}</div><div className="text-xs text-gray-500">Identities correlated</div></div>
        <div className="rounded border border-border p-3"><div className="text-lg text-gray-100">{warnings}</div><div className="text-xs text-gray-500">Warnings</div></div>
      </div>

      {persistenceSummary?.riskResult && <p className="text-sm text-gray-400">Risk scan: {persistenceSummary.riskResult.findingsDetected} new findings from {persistenceSummary.riskResult.rulesRun} rules.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => window.open(`/graph?source=imported&importId=${importId}`, '_blank')}
          className="inline-flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Graph
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.open(`/risk`, '_blank')}
          className="inline-flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Risk Findings
        </Button>
        <Button variant="ghost" onClick={() => window.open('/', '_blank')}>Dashboard</Button>
        <Button variant="ghost" onClick={() => window.open('/enterprise-identity', '_blank')}>Enterprise Identities</Button>
        <Button variant="secondary" onClick={downloadReport}><Download className="h-4 w-4" />Download Import Report</Button>
        <Button variant="danger" onClick={onNewImport}>Start New Import</Button>
      </div>
    </div>
  )
}
