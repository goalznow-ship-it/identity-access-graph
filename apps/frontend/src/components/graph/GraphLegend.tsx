import { useState } from 'react'
import { nodeIcon } from './GraphNodeRenderer'

const NODE_TYPES = [
  ['User', '#3b82f6'], ['Group', '#22c55e'], ['Role', '#f97316'], ['Permission', '#eab308'],
  ['Host', '#a855f7'], ['Application', '#06b6d4'], ['Database', '#ec4899'], ['Business Service', '#ef4444'],
] as const

export function GraphLegend() {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300"><span>Visual legend</span><span>{open ? '−' : '+'}</span></button>
      {open && <div className="space-y-3 border-t border-border p-3 text-[10px] text-gray-400">
        <section><p className="mb-1.5 uppercase tracking-wider text-gray-500">Node types</p><div className="grid grid-cols-2 gap-1.5">{NODE_TYPES.map(([type, color]) => <span key={type} className="flex items-center gap-1.5"><i className="flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: color, color }}>{nodeIcon(type)}</i>{type}</span>)}</div></section>
        <section><p className="mb-1.5 uppercase tracking-wider text-gray-500">Relationships</p><div className="grid grid-cols-2 gap-1"><span className="text-red-400">━ Upstream</span><span className="text-green-400">━ Downstream</span><span className="text-cyan-400">━ Shortest path</span><span className="text-orange-400">━ Attack path</span><span>┅ Inherited</span><span>━ Direct</span></div></section>
        <section><p className="mb-1.5 uppercase tracking-wider text-gray-500">Risk rings</p><div className="flex flex-wrap gap-2"><span className="text-red-400">◉ Critical</span><span className="text-orange-400">◉ High</span><span className="text-yellow-400">◉ Medium</span><span className="text-green-400">• Low</span></div></section>
        <section><p className="mb-1.5 uppercase tracking-wider text-gray-500">Source badges</p><div className="flex gap-1.5">{['AD', 'IPA', 'Linux', 'Import'].map((source) => <span key={source} className="rounded bg-slate-700 px-1.5 py-0.5 text-white">{source}</span>)}</div></section>
      </div>}
    </div>
  )
}
