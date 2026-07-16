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
  const degree = selectedNode
    ? data.links.filter(
        (l) =>
          (l.source as string) === selectedNode.id ||
          (l.target as string) === selectedNode.id,
      ).length
    : 0

  const stats = [
    { label: 'Nodes', value: visibleNodes },
    { label: 'Relationships', value: visibleLinks },
    { label: 'Critical', value: criticalNodes },
    ...(selectedNode ? [{ label: 'Degree', value: degree }] : []),
  ]

  return (
    <div className="flex gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="px-3 py-2" glass>
          <p className="text-xs text-gray-500">{s.label}</p>
          <p className="text-sm font-semibold text-gray-200">{s.value}</p>
        </Card>
      ))}
    </div>
  )
}
