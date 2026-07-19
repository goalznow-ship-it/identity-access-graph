import { memo, type ComponentType } from 'react'
import { Link } from 'react-router-dom'

export const KpiCard = memo(function KpiCard({ label, value, icon: Icon, color = '#38bdf8', to }: { label: string; value: number | string; icon: ComponentType<{ className?: string }>; color?: string; to: string }) {
  return <Link to={to} aria-label={`Open ${label}`} className="group rounded-xl border border-border bg-card/80 p-4 shadow-glass transition duration-200 hover:-translate-y-0.5 hover:border-white/15 focus:outline-none focus:ring-2 focus:ring-primary">
    <div className="flex items-start justify-between"><span className="rounded-lg p-2" style={{ backgroundColor: `${color}18`, color }}><Icon className="h-4 w-4" /></span><span className="text-[10px] font-medium text-gray-500">Live</span></div>
    <div className="mt-3 text-2xl font-semibold tracking-tight text-gray-100">{typeof value === 'number' ? value.toLocaleString() : value}</div><div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className="mt-3 h-1 w-full rounded" style={{ backgroundColor: `${color}35` }} />
  </Link>
})
