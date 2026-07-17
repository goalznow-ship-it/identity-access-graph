import { useState } from 'react'
import { Server, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'
import { persistImport, runRiskScan } from '../../services/importApi'
import type { ImportPersistenceSummary } from '../../types/import'

interface PersistImportPanelProps {
  importId: string
  onPersisted: (summary: ImportPersistenceSummary) => void
}

export function PersistImportPanel({ importId, onPersisted }: PersistImportPanelProps) {
  const [persisting, setPersisting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [summary, setSummary] = useState<ImportPersistenceSummary | null>(null)
  const [scanResult, setScanResult] = useState<{
    rulesRun: number
    findingsDetected: number
    totalFindings: number
    durationMs: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [runScan, setRunScan] = useState(true)
  const [switchSource, setSwitchSource] = useState(true)
  const [keepSession, setKeepSession] = useState(true)

  const handlePersist = async () => {
    setPersisting(true)
    setError(null)
    try {
      const result = await persistImport(importId)
      const completed: ImportPersistenceSummary = { ...result, switchedToNeo4j: switchSource, keptSession: keepSession }
      setSummary(completed)

      if (runScan) {
        setScanning(true)
        try {
          const scan = await runRiskScan('neo4j')
          setScanResult(scan)
          completed.riskResult = scan
        } catch {
          setScanResult(null)
          completed.riskResult = null
        } finally {
          setScanning(false)
        }
      }
      if (switchSource) {
        localStorage.setItem('iag-graph-source', 'neo4j')
        window.dispatchEvent(new CustomEvent('iag-graph-source-change', { detail: 'neo4j' }))
      }
      if (keepSession) localStorage.setItem('lastImportId', importId)
      else localStorage.removeItem('iag-active-import')
      onPersisted(completed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Persistence failed')
    } finally {
      setPersisting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Server className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-medium text-gray-200">Persist to Graph Database</h3>
      </div>

      <p className="text-xs text-gray-500">
        Save the converted graph data to Neo4j. A risk scan will run automatically after persistence.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {summary ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Graph persisted successfully</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-800/50 p-3 text-center">
              <div className="text-xl font-bold text-gray-100">{summary.nodesUpserted.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase">Nodes</div>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-3 text-center">
              <div className="text-xl font-bold text-gray-100">{summary.relationshipsUpserted.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase">Relationships</div>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-3 text-center">
              <div className="text-xl font-bold text-gray-100">{summary.skipped.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase">Skipped</div>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-3 text-center">
              <div className="text-xl font-bold text-yellow-400">{summary.conflicts.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase">Conflicts</div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Duration: {(summary.durationMs / 1000).toFixed(1)}s
          </div>

          {scanning && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running risk scan...
            </div>
          )}

          {scanResult && (
            <div className="rounded-lg border border-blue-800 bg-blue-900/20 p-3">
              <div className="flex items-center gap-2 text-blue-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Risk Scan Complete</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-400">
                <span>{scanResult.rulesRun} rules run</span>
                <span>{scanResult.findingsDetected} new findings</span>
                <span>{scanResult.totalFindings} total findings</span>
                <span>{(scanResult.durationMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2 text-xs text-gray-300">
            <label className="flex gap-2"><input type="checkbox" checked={runScan} onChange={(e) => setRunScan(e.target.checked)} /> Run risk scan</label>
            <label className="flex gap-2"><input type="checkbox" checked={switchSource} onChange={(e) => setSwitchSource(e.target.checked)} /> Switch active source to Neo4j Live</label>
            <label className="flex gap-2"><input type="checkbox" checked={keepSession} onChange={(e) => setKeepSession(e.target.checked)} /> Keep imported session</label>
            <label className="flex gap-2 font-medium text-yellow-300"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I confirm this import may update existing graph records.</label>
          </div>
          <Button onClick={handlePersist} disabled={persisting || !confirmed} className="inline-flex items-center gap-2">
            {persisting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
            {persisting ? (scanning ? 'Running risk scan...' : 'Persisting...') : 'Persist to Neo4j'}
          </Button>
        </div>
      )}
    </div>
  )
}
