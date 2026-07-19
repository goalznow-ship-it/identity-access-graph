import { useEffect, useState } from 'react'
import { AlertTriangle, Search, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAttackPathHistory } from '../../services/attackPathApi'
import type { AttackPathRun } from '../../types/attackPath'
import { Panel } from './IdentityDistribution'

export function RecentInvestigations() {
  const [runs, setRuns] = useState<AttackPathRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let cancelled = false; void getAttackPathHistory(8).then((items) => { if (!cancelled) setRuns(items) }).catch((cause) => { if (!cancelled) setError((cause as Error).message) }).finally(() => { if (!cancelled) setLoading(false) }); return () => { cancelled = true } }, [])
  return <Panel title="Recent Attack-Path Investigations">{loading ? <div className="h-24 animate-pulse rounded bg-white/5" /> : error ? <p role="alert" className="py-8 text-center text-xs text-danger">{error}</p> : runs.length === 0 ? <p className="py-8 text-center text-xs text-gray-500">No attack-path analyses have been run.</p> : <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{runs.map((run) => { const Icon = run.status === 'FAILED' ? AlertTriangle : run.pathCount ? Shield : Search; return <Link key={run.id} to="/attack-paths" className="rounded-lg border border-border bg-surface/50 p-3 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-primary"><Icon className="h-3.5 w-3.5" />{run.status}</div><p className="mt-2 truncate text-xs font-medium text-gray-300">{run.request.sourceNodeId || 'All identities'} → {run.request.targetNodeId || run.request.targetType || 'privileged targets'}</p><p className="mt-1 text-[10px] text-gray-600">{run.pathCount} paths · {run.durationMs ?? 0}ms · {new Date(run.startedAt).toLocaleString()}</p></Link> })}</div>}</Panel>
}
