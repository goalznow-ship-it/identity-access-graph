import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle, GitBranch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { pipelineApi } from '../../services/pipelineApi'
import type { PipelineRun } from '../../types/pipeline'
import { Panel } from './IdentityDistribution'

export function PipelineOverview() {
  const navigate = useNavigate()
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let cancelled = false; void pipelineApi.getState().then((value) => { if (!cancelled) setRun(value) }).catch((cause) => { if (!cancelled) setError((cause as Error).message) }).finally(() => { if (!cancelled) setLoading(false) }); return () => { cancelled = true } }, [])
  const duration = run?.startedAt ? Math.max(0, new Date(run.completedAt ?? Date.now()).getTime() - new Date(run.startedAt).getTime()) : 0
  const metricValues = Object.values(run?.metrics ?? {})
  const warnings = metricValues.reduce((sum, metric) => sum + metric.warnings, 0)
  const errors = (run?.errors.length ?? 0) + metricValues.reduce((sum, metric) => sum + metric.errors, 0)
  return <Panel title="Pipeline Status" action={<button onClick={() => navigate('/pipeline')} className="text-xs text-primary hover:underline">View pipeline</button>}>{loading ? <div className="h-28 animate-pulse rounded bg-white/5" /> : error ? <p role="alert" className="py-8 text-center text-xs text-danger">{error}</p> : !run ? <p className="py-8 text-center text-xs text-gray-500">Pipeline state is unavailable.</p> : <><div className="flex items-center gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><GitBranch className="h-5 w-5" /></span><div><p className="text-xs font-medium text-gray-200">Enterprise Identity Reconciliation</p><p className="text-[10px] text-gray-500">{run.status.replace(/_/g, ' ')}{run.currentStage ? ` · ${run.currentStage.replace(/_/g, ' ')}` : ''}</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, run.progress))}%` }} /></div><div className="mt-5 grid grid-cols-4 gap-2 text-center">{[[CheckCircle, run.completedStages.length, 'Completed', 'text-success'], [Activity, warnings, 'Warnings', 'text-warning'], [AlertTriangle, errors, 'Errors', 'text-danger'], [Activity, `${(duration / 1000).toFixed(1)}s`, 'Duration', 'text-primary']].map(([Icon, value, label, tone]: any) => <div key={label} className="rounded-lg bg-surface/60 p-2"><Icon className={`mx-auto h-3.5 w-3.5 ${tone}`} /><div className="mt-1 text-sm font-semibold text-gray-200">{value}</div><div className="text-[9px] text-gray-600">{label}</div></div>)}</div></>}</Panel>
}
