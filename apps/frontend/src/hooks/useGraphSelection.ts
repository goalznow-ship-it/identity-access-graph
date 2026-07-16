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

  if (all) {
    while (queueUp.length > 0) {
      const current = queueUp.pop()!
      if (visitedUp.has(current)) continue
      visitedUp.add(current)
      for (const link of links) {
        if (link.target === current && link.source !== current && !visitedUp.has(link.source as string)) {
          upstream.add(link.source as string)
          queueUp.push(link.source as string)
        }
      }
    }
    while (queueDown.length > 0) {
      const current = queueDown.pop()!
      if (visitedDown.has(current)) continue
      visitedDown.add(current)
      for (const link of links) {
        if (link.source === current && link.target !== current && !visitedDown.has(link.target as string)) {
          downstream.add(link.target as string)
          queueDown.push(link.target as string)
        }
      }
    }
  } else {
    for (const link of links) {
      if (link.target === nodeId && link.source !== nodeId) {
        upstream.add(link.source as string)
      }
      if (link.source === nodeId && link.target !== nodeId) {
        downstream.add(link.target as string)
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
    if (!node) setHighlightMode('none')
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
