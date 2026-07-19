import { lazy, memo, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, AppWindow, Building2, UserX, Server, Key, Monitor, Shield, Users } from 'lucide-react'
import type { GraphData } from '../../types/graph'
import type { DashboardSummary } from '../../types/neo4j'
import { KpiCard } from './KpiCard'
import { IdentityDistribution, Panel } from './IdentityDistribution'
import { RiskOverview } from './RiskOverview'
import { ComplianceOverview } from './ComplianceOverview'
import { LatestChanges } from './LatestChanges'
import { RecentImports } from './RecentImports'
import { PipelineOverview } from './PipelineOverview'
import { QuickActions } from './QuickActions'
import { RecentInvestigations } from './RecentInvestigations'

const GraphPreview = lazy(() => import('./GraphPreview'))

export const DashboardGrid = memo(function DashboardGrid({ data, summary }: { data: GraphData; summary?: DashboardSummary | null }) {
  const navigate = useNavigate()
  const count = (types: string[]) => data.nodes.filter((node) => types.includes(node.nodeType)).length
  const identities = summary?.totalIdentities ?? count(['USER', 'LINUX_USER', 'SERVICE_ACCOUNT', 'MANAGED_SERVICE_ACCOUNT'])
  const localIdentityNodes = data.nodes.filter((node) => ['USER', 'LINUX_USER', 'SERVICE_ACCOUNT', 'MANAGED_SERVICE_ACCOUNT'].includes(node.nodeType))
  const active = summary?.activeAccounts ?? localIdentityNodes.filter((node) => String(node.properties.status ?? '').toUpperCase() === 'ACTIVE').length
  const disabled = summary?.disabledAccounts ?? localIdentityNodes.filter((node) => String(node.properties.status ?? '').toUpperCase() === 'DISABLED' || Boolean(node.properties.disabled)).length
  const privileged = summary?.privilegedAccounts ?? localIdentityNodes.filter((node) => Boolean(node.properties.privileged)).length
  const riskCounts = summary?.riskCounts ?? Object.fromEntries(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].map((level) => [level, data.nodes.filter((node) => node.riskLevel === level).length]))
  const sourceCounts = summary?.sourceSystemCounts ?? data.nodes.reduce<Record<string, number>>((counts, node) => { counts[node.sourceSystem] = (counts[node.sourceSystem] ?? 0) + 1; return counts }, {})
  const risk = (level: string) => riskCounts[level] ?? 0
  const openFindings = Object.entries(riskCounts).filter(([level]) => level !== 'NONE').reduce((sum, [, value]) => sum + value, 0)
  const kpis = [
    { label: 'Total Identities', to: '/identities', value: identities, icon: Users, color: '#38bdf8' },
    { label: 'Active Accounts', to: '/identities?status=ACTIVE', value: active, icon: Users, color: '#22c55e' },
    { label: 'Disabled Accounts', to: '/identities?status=DISABLED', value: disabled, icon: UserX, color: '#94a3b8' },
    { label: 'Privileged Accounts', to: '/identities?privileged=true', value: privileged, icon: Key, color: '#8b5cf6' },
    { label: 'Applications', to: '/graph?nodeType=APPLICATION', value: summary?.applications ?? count(['APPLICATION']), icon: AppWindow, color: '#06b6d4' },
    { label: 'Hosts', to: '/graph?nodeType=HOST', value: summary?.hosts ?? count(['HOST', 'COMPUTER']), icon: Monitor, color: '#a855f7' },
    { label: 'Databases', to: '/graph?nodeType=DATABASE', value: summary?.databases ?? count(['DATABASE']), icon: Server, color: '#ec4899' },
    { label: 'Business Services', to: '/graph?nodeType=BUSINESS_SERVICE', value: summary?.businessServices ?? count(['BUSINESS_SERVICE']), icon: Building2, color: '#6366f1' },
    { label: 'Critical Risks', to: '/risk?severity=CRITICAL', value: risk('CRITICAL'), icon: Shield, color: '#ef4444' },
    { label: 'Open Findings', to: '/risk', value: openFindings, icon: AlertTriangle, color: '#f97316' },
  ]
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}</div>
    <div className="grid gap-4 lg:grid-cols-3"><IdentityDistribution counts={sourceCounts} onSelect={(source) => navigate(`/graph?sourceSystem=${encodeURIComponent(source)}`)} /><RiskOverview counts={riskCounts} onSelect={(level) => navigate(`/risk?severity=${level}`)} /><ComplianceOverview total={identities} active={active} disabled={disabled} privileged={privileged} onSelect={navigate} /></div>
    <div className="grid gap-4 xl:grid-cols-3"><Suspense fallback={<div className="h-[425px] animate-pulse rounded-xl bg-white/5 xl:col-span-2" />}><GraphPreview data={data} /></Suspense><LatestChanges /></div>
    <Panel title="Risk Findings" action={<button onClick={() => navigate('/risk')} className="text-xs text-primary">View all findings</button>}><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Critical', risk('CRITICAL'), '#ef4444'], ['High', risk('HIGH'), '#f97316'], ['Medium', risk('MEDIUM'), '#eab308'], ['Low', risk('LOW'), '#22c55e']].map(([label, value, color]) => <button key={label as string} onClick={() => navigate(`/risk?severity=${String(label).toUpperCase()}`)} className="rounded-lg border border-border bg-surface/50 p-4 text-left focus:ring-2 focus:ring-primary"><AlertTriangle className="h-4 w-4" style={{ color: color as string }} /><div className="mt-3 text-2xl font-semibold">{value}</div><div className="text-xs" style={{ color: color as string }}>{label} findings</div></button>)}</div></Panel>
    <div className="grid gap-4 xl:grid-cols-2"><RecentImports /><PipelineOverview /></div><QuickActions /><RecentInvestigations />
  </div>
})
