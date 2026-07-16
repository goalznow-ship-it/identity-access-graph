import type { GraphLayout, GraphNode } from '../../types/graph'

export function GraphStatusBar({ nodes, links, selected, mode, layout, source, zoom }: { nodes: number; links: number; selected: GraphNode | null; mode: string; layout: GraphLayout; source: string; zoom: number }) {
  return <div className="flex h-7 shrink-0 items-center gap-4 overflow-x-auto border-t border-border bg-surface/90 px-3 text-[10px] text-gray-500"><span>{nodes} nodes</span><span>{links} relationships</span><span>Selected: <b className="text-gray-300">{selected?.displayName ?? 'None'}</b></span><span>Mode: {mode}</span><span>Layout: {layout}</span><span>Source: {source}</span><span>Zoom: {zoom.toFixed(2)}×</span></div>
}
