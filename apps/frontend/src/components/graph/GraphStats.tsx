import type { GraphData, GraphNode, RiskLevel } from '../../types/graph'

interface GraphStatsProps {
  data: GraphData | null
  selectedNode: GraphNode | null
}

export function GraphStats({ data, selectedNode }: GraphStatsProps) {
  if (!data) return null

  const visibleNodes = data.nodes.length
  const visibleLinks = data.links.length
  const criticalNodes = data.nodes.filter((n) => n.riskLevel === 'CRITICAL' as RiskLevel).length
  const sourceCount = new Set(data.nodes.map((node) => node.sourceSystem)).size
  const degree = selectedNode
    ? data.links.filter(
        (l) =>
          (typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === selectedNode.id ||
          (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === selectedNode.id,
      ).length
    : 0

  const stats = [
    { label: 'Nodes', value: visibleNodes },
    { label: 'Edges', value: visibleLinks },
    { label: 'Critical', value: criticalNodes, warn: criticalNodes > 0 },
    { label: 'Sources', value: sourceCount },
    ...(selectedNode ? [{ label: 'Degree', value: degree }] : []),
  ]

  return (
    <div className="flex items-center gap-1.5">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-lg border ${'warn' in s && s.warn ? 'border-red-500/20 bg-red-500/10' : 'border-border bg-card/40'} px-2.5 py-1.5`}>
          <p className={`text-[10px] ${'warn' in s && s.warn ? 'text-red-400' : 'text-gray-500'}`}>{s.label}</p>
          <p className="text-xs font-semibold text-gray-200">{s.value}</p>
        </div>
      ))}
    </div>
  )
}
