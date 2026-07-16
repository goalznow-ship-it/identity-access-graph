import { memo, type ComponentType } from 'react'

export const KpiCard = memo(function KpiCard({ label, value, trend, icon: Icon, color = '#38bdf8', points }: { label: string; value: number | string; trend: string; icon: ComponentType<{ className?: string }>; color?: string; points: number[] }) {
  const coordinates = points.map((point, index) => `${index * 20},${28 - point * .22}`).join(' ')
  return <article className="group rounded-xl border border-border bg-card/80 p-4 shadow-glass transition duration-200 hover:-translate-y-0.5 hover:border-white/15">
    <div className="flex items-start justify-between"><span className="rounded-lg p-2" style={{ backgroundColor: `${color}18`, color }}><Icon className="h-4 w-4" /></span><span className={`text-[10px] font-medium ${trend.startsWith('+') ? 'text-success' : 'text-gray-400'}`}>{trend}</span></div>
    <div className="mt-3 text-2xl font-semibold tracking-tight text-gray-100">{typeof value === 'number' ? value.toLocaleString() : value}</div><div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <svg className="mt-3 h-7 w-full" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden><polyline fill="none" stroke={color} strokeWidth="1.5" points={coordinates} opacity=".8" /></svg>
  </article>
})
