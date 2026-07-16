import { useState, useCallback, useMemo } from 'react'
import type { GraphNode, GraphLink, DependencyInfo, HighlightMode } from '../types/graph'

interface UseGraphSelectionReturn {
  selectedNode: GraphNode | null
  highlightMode: HighlightMode
  dependencyInfo: DependencyInfo | null
  selectNode: (node: GraphNode | null) => void
  setHighlightMode: (mode: HighlightMode) => void
  clearSelection: () => void
}

function computeDependencies(
  nodeId: string,
  links: GraphLink[],
  all: boolean,
): DependencyInfo {
  const upstream = new Set<string>()
  const downstream = new Set<string>()

  const queueUp = [nodeId]
  const queueDown = [nodeId]
  const visitedUp = new Set<string>()
  const visitedDown = new Set<string>()
  const sourceId = (link: GraphLink) => typeof link.source === 'object' ? (link.source as GraphNode).id : link.source
  const targetId = (link: GraphLink) => typeof link.target === 'object' ? (link.target as GraphNode).id : link.target

  if (all) {
    while (queueUp.length > 0) {
      const current = queueUp.pop()!
      if (visitedUp.has(current)) continue
      visitedUp.add(current)
      for (const link of links) {
        const source = sourceId(link); const target = targetId(link)
        if (target === current && source !== current && !visitedUp.has(source)) {
          upstream.add(source)
          queueUp.push(source)
        }
      }
    }
    while (queueDown.length > 0) {
      const current = queueDown.pop()!
      if (visitedDown.has(current)) continue
      visitedDown.add(current)
      for (const link of links) {
        const source = sourceId(link); const target = targetId(link)
        if (source === current && target !== current && !visitedDown.has(target)) {
          downstream.add(target)
          queueDown.push(target)
        }
      }
    }
  } else {
    for (const link of links) {
      const source = sourceId(link); const target = targetId(link)
      if (target === nodeId && source !== nodeId) {
        upstream.add(source)
      }
      if (source === nodeId && target !== nodeId) {
        downstream.add(target)
      }
    }
  }

  upstream.delete(nodeId)
  downstream.delete(nodeId)

  return {
    upstream: Array.from(upstream),
    downstream: Array.from(downstream),
    allUpstream: all ? Array.from(upstream) : [],
    allDownstream: all ? Array.from(downstream) : [],
  }
}

export function useGraphSelection(
  links: GraphLink[],
): UseGraphSelectionReturn {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('none')

  const dependencyInfo = useMemo(() => {
    if (!selectedNode || highlightMode === 'none') return null
    return computeDependencies(selectedNode.id, links, highlightMode === 'all')
  }, [selectedNode, highlightMode, links])

  const selectNode = useCallback((node: GraphNode | null) => {
    setSelectedNode(node)
    setHighlightMode(node ? 'direct' : 'none')
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNode(null)
    setHighlightMode('none')
  }, [])

  return {
    selectedNode,
    highlightMode,
    dependencyInfo,
    selectNode,
    setHighlightMode,
    clearSelection,
  }
}
