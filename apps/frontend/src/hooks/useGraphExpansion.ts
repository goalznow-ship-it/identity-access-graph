import { useCallback, useEffect, useState } from 'react'
import type { GraphData } from '../types/graph'

export type ExpansionDirection = 'both' | 'incoming' | 'outgoing'

export function useGraphExpansion(data: GraphData | null) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())

  useEffect(() => { setVisibleIds(new Set(data?.nodes.map((node) => node.id) ?? [])) }, [data])

  const neighbors = useCallback((startId: string, direction: ExpansionDirection, depth: number) => {
    const found = new Set<string>([startId])
    let frontier = new Set<string>([startId])
    for (let level = 0; level < Math.min(5, Math.max(1, depth)); level++) {
      const next = new Set<string>()
      for (const link of data?.links ?? []) {
        const source = typeof link.source === 'object' ? (link.source as { id: string }).id : link.source
        const target = typeof link.target === 'object' ? (link.target as { id: string }).id : link.target
        if (direction !== 'incoming' && frontier.has(source) && !found.has(target)) next.add(target)
        if (direction !== 'outgoing' && frontier.has(target) && !found.has(source)) next.add(source)
      }
      next.forEach((id) => found.add(id))
      frontier = next
      if (frontier.size === 0) break
    }
    return found
  }, [data])

  const expand = useCallback((nodeId: string, direction: ExpansionDirection = 'both', depth = 1) => {
    const additions = neighbors(nodeId, direction, depth)
    setVisibleIds((current) => new Set([...current, ...additions]))
  }, [neighbors])

  const collapse = useCallback((nodeId: string) => {
    const removals = neighbors(nodeId, 'both', 1)
    removals.delete(nodeId)
    setVisibleIds((current) => new Set([...current].filter((id) => !removals.has(id))))
  }, [neighbors])

  const hide = useCallback((nodeId: string) => setVisibleIds((current) => {
    const next = new Set(current); next.delete(nodeId); return next
  }), [])

  const visibleData: GraphData = {
    nodes: data?.nodes.filter((node) => visibleIds.has(node.id)) ?? [],
    links: data?.links.filter((link) => {
      const source = typeof link.source === 'object' ? (link.source as { id: string }).id : link.source
      const target = typeof link.target === 'object' ? (link.target as { id: string }).id : link.target
      return visibleIds.has(source) && visibleIds.has(target)
    }) ?? [],
  }

  return { visibleData, visibleIds, expand, collapse, hide }
}
