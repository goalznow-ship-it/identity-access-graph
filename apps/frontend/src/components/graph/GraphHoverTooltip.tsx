import type { GraphNode } from '../../types/graph'
import { getNodeColor } from '../../services/graphDataAdapter'

export function GraphHoverTooltip({ node, position, degree }: { node: GraphNode | null; position: { x: number; y: number }; degree: number }) {
  if (!node) return null
  const context = node.properties.department ?? node.properties.hostname ?? node.properties.applicationName
  const status = node.properties.status ? String(node.properties.status) : 'Unknown'
  const color = getNodeColor(node)
  const riskColors: Record<string, string> = { CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400', LOW: 'text-green-400', NONE: 'text-gray-500' }
  return (
    <div
      className="pointer-events-none absolute z-40 w-60 overflow-hidden rounded-xl border border-border bg-surface/95 p-0 text-xs shadow-2xl backdrop-blur-xl"
      style={{ left: position.x + 14, top: position.y + 14 }}
    >
      <div className="flex items-center gap-2.5 border-b border-border bg-white/[0.03] px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold" style={{ backgroundColor: `${color}20`, color }}>{node.nodeType === 'USER' ? node.displayName[0] : node.nodeType[0]}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-gray-100">{node.displayName}</div>
          <div className="truncate text-[10px] text-gray-500">{node.nodeType} · {node.sourceSystem}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/40 p-2">
        <div className="rounded bg-white/[0.02] px-2 py-1">
          <div className="text-[10px] text-gray-500">Risk</div>
          <div className={`font-medium ${riskColors[node.riskLevel] ?? 'text-gray-300'}`}>{node.riskLevel}</div>
        </div>
        <div className="rounded bg-white/[0.02] px-2 py-1">
          <div className="text-[10px] text-gray-500">Status</div>
          <div className="font-medium text-gray-300">{status}</div>
        </div>
        <div className="rounded bg-white/[0.02] px-2 py-1">
          <div className="text-[10px] text-gray-500">Connections</div>
          <div className="font-medium text-gray-300">{degree}</div>
        </div>
        {context != null && <div className="rounded bg-white/[0.02] px-2 py-1">
          <div className="text-[10px] text-gray-500">Context</div>
          <div className="truncate font-medium text-gray-300">{String(context)}</div>
        </div>}
      </div>
      {node.properties.privileged === true && <div className="border-t border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[10px] font-medium text-orange-400">Privileged account</div>}
    </div>
  )
}
