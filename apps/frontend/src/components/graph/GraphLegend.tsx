import { useState } from 'react'
import { nodeIcon } from './GraphNodeRenderer'

const NODE_TYPES = [
  ['User', '#3b82f6'], ['Group', '#22c55e'], ['Role', '#f97316'], ['Permission', '#eab308'],
  ['Host', '#a855f7'], ['Application', '#06b6d4'], ['Database', '#ec4899'], ['Business Service', '#ef4444'],
] as const

export function GraphLegend() {
  const [open, setOpen] = useState(true)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/[0.02]">
        <span>Legend</span>
        <svg className={`h-3 w-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <div className="space-y-3 border-t border-border p-3 text-[10px]">
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-500">Node types</p>
          <div className="grid grid-cols-2 gap-1">
            {NODE_TYPES.map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5 rounded-md bg-white/[0.02] px-1.5 py-1 text-gray-400">
                <span className="flex h-4 w-4 items-center justify-center rounded text-[7px] font-bold" style={{ backgroundColor: `${color}20`, color }}>{nodeIcon(type)}</span>
                {type}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-500">Relationships</p>
          <div className="grid grid-cols-2 gap-1 text-gray-400">
            <span className="flex items-center gap-1"><span className="h-px w-3 bg-red-400" /> Upstream</span>
            <span className="flex items-center gap-1"><span className="h-px w-3 bg-green-400" /> Downstream</span>
            <span className="flex items-center gap-1"><span className="h-px w-3 bg-cyan-400" /> Shortest</span>
            <span className="flex items-center gap-1"><span className="h-px w-3 bg-orange-400" /> Attack</span>
            <span className="flex items-center gap-1"><span className="h-px w-3 bg-border" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0, transparent 2px, rgba(148,163,184,0.4) 2px, rgba(148,163,184,0.4) 6px)' }} /> Inherited</span>
            <span className="flex items-center gap-1"><span className="h-px w-3 bg-gray-500" /> Direct</span>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-500">Risk rings</p>
          <div className="flex flex-wrap gap-2 text-gray-400">
            {([['Critical', 'bg-red-400'], ['High', 'bg-orange-400'], ['Medium', 'bg-yellow-400'], ['Low', 'bg-green-400']] as const).map(([label, bg]) => (
              <span key={label} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${bg}`} /> {label}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-500">Source badges</p>
          <div className="flex flex-wrap gap-1">
            {['AD', 'IPA', 'NIX', 'IMP', 'MAN', 'N4J'].map((s) => (
              <span key={s} className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-gray-400">{s}</span>
            ))}
          </div>
        </div>
      </div>}
    </div>
  )
}
