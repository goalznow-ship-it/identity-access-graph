import type { GraphLayout, GraphNode } from '../../types/graph'

export function GraphStatusBar({ nodes, links, hidden, selected, mode, view, layout, source, zoom }: { nodes: number; links: number; hidden: number; selected: GraphNode | null; mode: string; view: string; layout: GraphLayout; source: string; zoom: number }) {
  const dense = nodes > 1500 || links > 7000
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 overflow-x-auto border-t border-border bg-surface/60 px-3 text-[10px] text-gray-500">
      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary/60" />{nodes} nodes</span>
      <span className="text-border">|</span>
      <span>{links} edges</span>
      {hidden > 0 && <><span className="text-border">|</span><span className="text-gray-600">{hidden} hidden</span></>}
      {selected && <><span className="text-border">|</span><span className="text-gray-400">{selected.displayName}</span></>}
      <span className="hidden text-gray-600 sm:inline">{view} · {mode} · {layout} · {source}</span>
      <span className="ml-auto flex items-center gap-1">
        <span className={`rounded px-1 py-0.5 ${dense ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{dense ? 'Dense' : 'Optimal'}</span>
        <span className="text-gray-600">{zoom.toFixed(1)}×</span>
      </span>
    </div>
  )
}
