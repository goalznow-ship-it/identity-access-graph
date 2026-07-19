import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getImportHistory, getImportStatistics } from '../../services/importApi'
import type { ImportSession } from '../../types/import'
import { Panel } from './IdentityDistribution'

type Row = { session: ImportSession; statistics: Record<string, any> | null }

export function RecentImports() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void getImportHistory(5, 0).then(async ({ imports }) => {
      const values = await Promise.all(imports.map(async (session) => ({ session, statistics: await getImportStatistics(session.importId).catch(() => null) })))
      if (!cancelled) setRows(values)
    }).catch((cause) => { if (!cancelled) setError((cause as Error).message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return <Panel title="Recent Imports" className="overflow-hidden" action={<button onClick={() => navigate('/imports')} className="text-xs text-primary hover:underline">Open imports</button>}>
    {loading ? <div aria-label="Loading recent imports" className="h-28 animate-pulse rounded bg-white/5" /> : error ? <p role="alert" className="py-8 text-center text-xs text-danger">{error}</p> : rows.length === 0 ? <p className="py-8 text-center text-xs text-gray-500">No imports have been run.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-gray-600"><tr>{['Imported file', 'Status', 'Records', 'Files', 'Validation issues', 'Duration'].map((item) => <th key={item} className="pb-3 pr-4 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map(({ session, statistics }) => {
      const failed = session.cancelled || Number(statistics?.failedFiles ?? session.progress?.filesFailed ?? 0) > 0
      const fileName = session.files.map((file) => file.originalName).join(', ') || session.importId
      const duration = session.progress?.elapsedMs ? `${(session.progress.elapsedMs / 1000).toFixed(1)}s` : '—'
      return <tr key={session.importId} tabIndex={0} onClick={() => navigate(`/imports?importId=${encodeURIComponent(session.importId)}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(`/imports?importId=${encodeURIComponent(session.importId)}`) }} className="cursor-pointer hover:bg-white/[.03] focus:bg-primary/10 focus:outline-none"><td title={fileName} className="max-w-52 truncate py-3 pr-4 font-medium text-gray-300">{fileName}</td><td className="pr-4">{failed ? <AlertTriangle className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />}</td><td className="pr-4 text-gray-400">{Number(statistics?.rows ?? session.progress?.totalRows ?? 0).toLocaleString()}</td><td className="pr-4 text-gray-400">{statistics?.files ?? session.files.length}</td><td className="pr-4 text-gray-400">{Number(statistics?.validation?.total ?? 0).toLocaleString()}</td><td className="text-gray-500">{duration}</td></tr>
    })}</tbody></table></div>}
  </Panel>
}
