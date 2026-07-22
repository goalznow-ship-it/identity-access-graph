import type { GraphData } from '../types/graph'
import { getImportGraphPreview, ImportApiError } from './importApi'
import { getSubgraph } from './neo4jGraphApi'
import { adaptNeo4jGraph } from './neo4jGraphAdapter'

export interface GraphLoadResult {
  data: GraphData
  source: 'active-import' | 'persisted'
  fallbackNotice: string | null
}

export const isEmptyGraph = (data: GraphData | null | undefined) => !data || data.nodes.length === 0

export async function loadPersistedGraph(
  filters: Record<string, unknown> = {},
  load = getSubgraph,
): Promise<GraphLoadResult> {
  const graph = await load({ limit: 500, relationshipLimit: 2000, ...filters })
  return { data: adaptNeo4jGraph(graph), source: 'persisted', fallbackNotice: null }
}

export async function loadImportedGraph(
  importId: string | null | undefined,
  filters: Record<string, unknown> = {},
  dependencies: {
    loadImportPreview?: typeof getImportGraphPreview
    loadPersisted?: typeof loadPersistedGraph
  } = {},
): Promise<GraphLoadResult> {
  const loadImportPreview = dependencies.loadImportPreview ?? getImportGraphPreview
  const loadPersisted = dependencies.loadPersisted ?? loadPersistedGraph
  if (!importId) return loadPersisted(filters)
  try {
    const preview = await loadImportPreview(importId, 500, 2000)
    return { data: { nodes: preview.nodes, links: preview.links }, source: 'active-import', fallbackNotice: null }
  } catch (error) {
    if (!(error instanceof ImportApiError) || error.status !== 404) throw error
    const persisted = await loadPersisted(filters)
    return { ...persisted, fallbackNotice: 'The requested import session is no longer active. Loaded the persisted graph instead.' }
  }
}
