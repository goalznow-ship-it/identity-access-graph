import { Card } from '../ui/Card'
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
  const density = visibleNodes > 1 ? (visibleLinks / (visibleNodes * (visibleNodes - 1))).toFixed(3) : '0'
  const degree = selectedNode
    ? data.links.filter(
        (l) =>
          (typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === selectedNode.id ||
          (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === selectedNode.id,
      ).length
    : 0

  const stats = [
    { label: 'Nodes', value: visibleNodes },
    { label: 'Relationships', value: visibleLinks },
    { label: 'Critical', value: criticalNodes },
    { label: 'Sources', value: sourceCount },
    { label: 'Density', value: density },
    ...(selectedNode ? [{ label: 'Degree', value: degree }] : []),
  ]

  return (
    <div className="flex max-w-full gap-2 overflow-x-auto">
      {stats.map((s) => (
        <Card key={s.label} className="px-3 py-2" glass>
          <p className="text-xs text-gray-500">{s.label}</p>
          <p className="text-sm font-semibold text-gray-200">{s.value}</p>
        </Card>
      ))}
    </div>
  )
}
