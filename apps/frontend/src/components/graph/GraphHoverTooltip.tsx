import type { GraphNode } from '../../types/graph'

export function GraphHoverTooltip({ node, position, degree }: { node: GraphNode | null; position: { x: number; y: number }; degree: number }) {
  if (!node) return null
  const context = node.properties.department ?? node.properties.hostname
  return <div className="pointer-events-none absolute z-40 w-56 rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-2xl backdrop-blur" style={{ left: position.x + 14, top: position.y + 14 }}><div className="font-semibold text-gray-100">{node.displayName}</div><div className="mt-2 grid grid-cols-2 gap-1 text-gray-500"><span>Type</span><span className="text-gray-300">{node.nodeType}</span><span>Source</span><span className="text-gray-300">{node.sourceSystem}</span><span>Risk</span><span className="text-gray-300">{node.riskLevel}</span><span>Status</span><span className="text-gray-300">{String(node.properties.status ?? 'Unknown')}</span><span>Degree</span><span className="text-gray-300">{degree}</span>{context != null && <><span>Context</span><span className="truncate text-gray-300">{String(context)}</span></>}</div></div>
}
