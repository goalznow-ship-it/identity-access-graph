import { useState, useMemo, useCallback } from 'react'
import type { GraphData, GraphFiltersState } from '../types/graph'

interface UseGraphFiltersReturn {
  filters: GraphFiltersState
  filteredData: GraphData
  setSystemFilter: (systems: GraphFiltersState['systems']) => void
  setNodeTypeFilter: (types: GraphFiltersState['nodeTypes']) => void
  setRelationshipTypeFilter: (types: GraphFiltersState['relationshipTypes']) => void
  setRiskLevelFilter: (levels: GraphFiltersState['riskLevels']) => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void
  allNodeTypes: string[]
  allRelationshipTypes: string[]
  allSourceSystems: string[]
  allRiskLevels: string[]
}

export function useGraphFilters(data: GraphData | null): UseGraphFiltersReturn {
  const [filters, setFilters] = useState<GraphFiltersState>({
    systems: [],
    nodeTypes: [],
    relationshipTypes: [],
    riskLevels: [],
    searchQuery: '',
  })

  const allNodeTypes = useMemo(() => {
    if (!data) return []
    const set = new Set(data.nodes.map((n) => n.nodeType))
    return Array.from(set)
  }, [data])

  const allRelationshipTypes = useMemo(() => {
    if (!data) return []
    const set = new Set(data.links.map((l) => l.relationshipType))
    return Array.from(set)
  }, [data])

  const allSourceSystems = useMemo(() => {
    if (!data) return []
    const set = new Set(data.nodes.map((n) => n.sourceSystem))
    return Array.from(set)
  }, [data])

  const allRiskLevels = useMemo(() => {
    if (!data) return []
    const set = new Set(data.nodes.map((n) => n.riskLevel))
    return Array.from(set)
  }, [data])

  const filteredData = useMemo(() => {
    if (!data) return { nodes: [], links: [] }

    let nodes = data.nodes
    let links = data.links

    if (filters.systems.length > 0) {
      const sys = new Set(filters.systems)
      const nodeIds = new Set(nodes.filter((n) => sys.has(n.sourceSystem)).map((n) => n.id))
      nodes = nodes.filter((n) => nodeIds.has(n.id))
      links = links.filter((l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string))
    }

    if (filters.nodeTypes.length > 0) {
      const types = new Set(filters.nodeTypes)
      const nodeIds = new Set(nodes.filter((n) => types.has(n.nodeType)).map((n) => n.id))
      nodes = nodes.filter((n) => nodeIds.has(n.id))
      links = links.filter((l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string))
    }

    if (filters.riskLevels.length > 0) {
      const rl = new Set(filters.riskLevels)
      const nodeIds = new Set(nodes.filter((n) => rl.has(n.riskLevel)).map((n) => n.id))
      nodes = nodes.filter((n) => nodeIds.has(n.id))
      links = links.filter((l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string))
    }

    if (filters.relationshipTypes.length > 0) {
      const types = new Set(filters.relationshipTypes)
      links = links.filter((l) => types.has(l.relationshipType))
    }

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase()
      const nodeIds = new Set(
        nodes.filter(
          (n) =>
            n.displayName.toLowerCase().includes(q) ||
            n.id.toLowerCase().includes(q) ||
            (n.sourceId && n.sourceId.toLowerCase().includes(q)),
        ).map((n) => n.id),
      )
      nodes = nodes.filter((n) => nodeIds.has(n.id))
      links = links.filter((l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string))
    }

    return { nodes, links }
  }, [data, filters])

  const setSystemFilter = useCallback((systems: GraphFiltersState['systems']) => {
    setFilters((prev) => ({ ...prev, systems }))
  }, [])

  const setNodeTypeFilter = useCallback((types: GraphFiltersState['nodeTypes']) => {
    setFilters((prev) => ({ ...prev, nodeTypes: types }))
  }, [])

  const setRelationshipTypeFilter = useCallback((types: GraphFiltersState['relationshipTypes']) => {
    setFilters((prev) => ({ ...prev, relationshipTypes: types }))
  }, [])

  const setRiskLevelFilter = useCallback((levels: GraphFiltersState['riskLevels']) => {
    setFilters((prev) => ({ ...prev, riskLevels: levels }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ systems: [], nodeTypes: [], relationshipTypes: [], riskLevels: [], searchQuery: '' })
  }, [])

  return {
    filters,
    filteredData,
    setSystemFilter,
    setNodeTypeFilter,
    setRelationshipTypeFilter,
    setRiskLevelFilter,
    setSearchQuery,
    resetFilters,
    allNodeTypes,
    allRelationshipTypes,
    allSourceSystems,
    allRiskLevels,
  }
}
