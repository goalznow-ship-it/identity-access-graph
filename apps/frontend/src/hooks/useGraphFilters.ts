import { useState, useMemo, useCallback } from 'react'
import type { GraphData, GraphFiltersState } from '../types/graph'

interface UseGraphFiltersReturn {
  filters: GraphFiltersState
  filteredData: GraphData
  setSystemFilter: (systems: GraphFiltersState['systems']) => void
  setNodeTypeFilter: (types: GraphFiltersState['nodeTypes']) => void
  setRelationshipTypeFilter: (types: GraphFiltersState['relationshipTypes']) => void
  setRiskLevelFilter: (levels: GraphFiltersState['riskLevels']) => void
  setStatusFilter: (statuses: string[]) => void
  setAccessFilter: (types: GraphFiltersState['accessTypes']) => void
  applyPreset: (preset: 'privileged' | 'highRisk' | 'identities' | 'infrastructure') => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void
  allNodeTypes: string[]
  allRelationshipTypes: string[]
  allSourceSystems: string[]
  allRiskLevels: string[]
  allStatuses: string[]
  allAccessTypes: string[]
}

export function graphEndpointId(endpoint: GraphData['links'][number]['source']): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id
}

function connectsOnly(link: GraphData['links'][number], nodeIds: Set<string>): boolean {
  return nodeIds.has(graphEndpointId(link.source)) && nodeIds.has(graphEndpointId(link.target))
}

export function useGraphFilters(data: GraphData | null): UseGraphFiltersReturn {
  const [filters, setFilters] = useState<GraphFiltersState>({
    systems: [],
    nodeTypes: [],
    relationshipTypes: [],
    riskLevels: [],
    statuses: [],
    accessTypes: [],
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
  const allStatuses = useMemo(() => Array.from(new Set((data?.nodes ?? []).map((node) => String(node.properties.status ?? 'UNKNOWN')))), [data])
  const allAccessTypes = useMemo(() => Array.from(new Set((data?.links ?? []).map((link) => link.relationshipType).filter((type) => ['HAS_ACCESS_TO','HAS_ACCESS','HAS_ROLE','GRANTS','HAS_PERMISSION','MEMBER_OF'].includes(type)))), [data])

  const filteredData = useMemo(() => {
    if (!data) return { nodes: [], links: [] }

    let nodes = data.nodes
    let links = data.links

    if (filters.systems.length > 0) {
      const sys = new Set(filters.systems)
      const nodeIds = new Set(nodes.filter((n) => sys.has(n.sourceSystem)).map((n) => n.id))
      nodes = nodes.filter((n) => nodeIds.has(n.id))
      links = links.filter((link) => connectsOnly(link, nodeIds))
    }

    if (filters.nodeTypes.length > 0) {
      const types = new Set(filters.nodeTypes)
      const nodeIds = new Set(nodes.filter((n) => types.has(n.nodeType)).map((n) => n.id))
      nodes = nodes.filter((n) => nodeIds.has(n.id))
      links = links.filter((link) => connectsOnly(link, nodeIds))
    }

    if (filters.riskLevels.length > 0) {
      const rl = new Set(filters.riskLevels)
      const nodeIds = new Set(nodes.filter((n) => rl.has(n.riskLevel)).map((n) => n.id))
      nodes = nodes.filter((n) => nodeIds.has(n.id))
      links = links.filter((link) => connectsOnly(link, nodeIds))
    }

    if (filters.statuses.length > 0) {
      const statuses = new Set(filters.statuses)
      const nodeIds = new Set(nodes.filter((node) => statuses.has(String(node.properties.status ?? 'UNKNOWN'))).map((node) => node.id))
      nodes = nodes.filter((node) => nodeIds.has(node.id))
      links = links.filter((link) => connectsOnly(link, nodeIds))
    }

    if (filters.accessTypes.length > 0) {
      const access = new Set(filters.accessTypes)
      links = links.filter((link) => access.has(link.relationshipType))
      const nodeIds = new Set(links.flatMap((link) => [graphEndpointId(link.source), graphEndpointId(link.target)]))
      nodes = nodes.filter((node) => nodeIds.has(node.id))
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
      links = links.filter((link) => connectsOnly(link, nodeIds))
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
  const setStatusFilter = useCallback((statuses: string[]) => setFilters((previous) => ({ ...previous, statuses })), [])
  const setAccessFilter = useCallback((accessTypes: GraphFiltersState['accessTypes']) => setFilters((previous) => ({ ...previous, accessTypes })), [])
  const applyPreset = useCallback((preset: 'privileged' | 'highRisk' | 'identities' | 'infrastructure') => {
    const presets: Record<typeof preset, Partial<GraphFiltersState>> = {
      privileged: { accessTypes: ['HAS_ROLE','GRANTS','HAS_PERMISSION','HAS_ACCESS_TO'] }, highRisk: { riskLevels: ['HIGH','CRITICAL'] },
      identities: { nodeTypes: ['USER','GROUP','ROLE','SERVICE_ACCOUNT','LINUX_USER','LINUX_GROUP'] }, infrastructure: { nodeTypes: ['HOST','COMPUTER','APPLICATION','DATABASE','BUSINESS_SERVICE'] },
    }
    setFilters((previous) => ({ ...previous, systems: [], nodeTypes: [], relationshipTypes: [], riskLevels: [], statuses: [], accessTypes: [], searchQuery: '', ...presets[preset] }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ systems: [], nodeTypes: [], relationshipTypes: [], riskLevels: [], statuses: [], accessTypes: [], searchQuery: '' })
  }, [])

  return {
    filters,
    filteredData,
    setSystemFilter,
    setNodeTypeFilter,
    setRelationshipTypeFilter,
    setRiskLevelFilter,
    setStatusFilter,
    setAccessFilter,
    applyPreset,
    setSearchQuery,
    resetFilters,
    allNodeTypes,
    allRelationshipTypes,
    allSourceSystems,
    allRiskLevels,
    allStatuses,
    allAccessTypes,
  }
}
