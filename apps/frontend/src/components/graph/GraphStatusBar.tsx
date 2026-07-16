import type { GraphLayout, GraphNode } from '../../types/graph'

export function GraphStatusBar({ nodes, links, hidden, selected, mode, view, layout, source, zoom }: { nodes: number; links: number; hidden: number; selected: GraphNode | null; mode: string; view: string; layout: GraphLayout; source: string; zoom: number }) {
  const performance=nodes>1500||links>7000?'Dense':nodes>600||links>2500?'Balanced':'Smooth'
  return <div className="flex h-7 shrink-0 items-center gap-4 overflow-x-auto border-t border-border bg-surface/90 px-3 text-[10px] text-gray-500"><span>{nodes} nodes</span><span>{links} relationships</span><span>{hidden} hidden</span><span>Selected: <b className="text-gray-300">{selected?.displayName ?? 'None'}</b></span><span>Mode: {mode}</span><span>View: {view}</span><span>Layout: {layout}</span><span>Source: {source}</span><span>Zoom: {zoom.toFixed(2)}×</span><span className={performance==='Dense'?'text-warning':'text-success'}>Performance: {performance}</span></div>
}
