import { useRef, useCallback, useEffect, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphNode, GraphLink, GraphData, HighlightMode, DependencyInfo } from '../../types/graph'
import { getNodeColor } from '../../services/graphDataAdapter'

interface GraphCanvasProps {
  data: GraphData
  selectedNode: GraphNode | null
  highlightMode: HighlightMode
  dependencyInfo: DependencyInfo | null
  onNodeClick: (node: GraphNode | null) => void
  onBackgroundClick: () => void
}

export function GraphCanvas({
  data,
  selectedNode,
  highlightMode,
  dependencyInfo,
  onNodeClick,
  onBackgroundClick,
}: GraphCanvasProps) {
  const fgRef = useRef<any>(null)

  const selectedIds = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    const ids = new Set<string>([selectedNode.id])
    if (dependencyInfo) {
      for (const id of dependencyInfo.upstream) ids.add(id)
      for (const id of dependencyInfo.downstream) ids.add(id)
      if (highlightMode === 'all') {
        for (const id of dependencyInfo.allUpstream) ids.add(id)
        for (const id of dependencyInfo.allDownstream) ids.add(id)
      }
    }
    return ids
  }, [selectedNode, dependencyInfo, highlightMode])

  const highlightSet = selectedIds
  const hasSelection = selectedIds.size > 1

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const gn = node as GraphNode
      const label = gn.displayName
      const edgeCount = typeof gn.properties?.edges === 'number' ? gn.properties.edges : 1
const size = Math.max(4, 24 / (1 + Math.log(edgeCount)))

      const isSelected = gn.id === selectedNode?.id
      const isHighlighted = highlightSet.has(gn.id)

      let alpha = 1
      if (hasSelection) {
        alpha = isHighlighted ? 1 : 0.2
      }

      ctx.globalAlpha = alpha

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
      ctx.fillStyle = getNodeColor(gn)
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if (globalScale >= 0.7) {
        ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1'
        ctx.font = `${Math.max(10, 12 / globalScale)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(label, node.x, node.y + size + 3)
      }

      ctx.globalAlpha = 1
    },
    [selectedNode, highlightSet, hasSelection],
  )

  const linkColor = useCallback(
    (link: any) => {
      if (!hasSelection) return 'rgba(255,255,255,0.15)'
      const l = link as GraphLink
      const sid = typeof l.source === 'object' ? (l.source as any).id : l.source
      const tid = typeof l.target === 'object' ? (l.target as any).id : l.target
      if (highlightSet.has(sid as string) && highlightSet.has(tid as string)) {
        return 'rgba(255,255,255,0.5)'
      }
      return 'rgba(255,255,255,0.04)'
    },
    [hasSelection, highlightSet],
  )

  const handleClick = useCallback(
    (node: any) => {
      if (node) {
        onNodeClick(node as GraphNode)
      } else {
        onBackgroundClick()
      }
    },
    [onNodeClick, onBackgroundClick],
  )

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation()
    }
  }, [data])

  return (
    <div className="h-full w-full">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        nodeCanvasObject={nodeCanvasObject}
        linkColor={linkColor}
        linkWidth={0.5}
        linkDirectionalParticles={0}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        onNodeClick={handleClick}
        onBackgroundClick={handleClick}
        cooldownTicks={100}
        nodeRelSize={4}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.1}
        maxZoom={10}
        width={800}
        height={600}
      />
    </div>
  )
}
