import { useState, useEffect } from 'react'
import type { GraphData } from '../types/graph'
import { buildGraphData } from '../services/graphDataAdapter'
import { getImportGraphPreview } from '../services/importApi'

interface UseGraphDataReturn {
  data: GraphData | null
  loading: boolean
  error: string | null
}

export function useGraphData(importId?: string | null): UseGraphDataReturn {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    const load = async () => {
      try {
        const result = importId ? await getImportGraphPreview(importId) : buildGraphData()
        if (active) setData({ nodes: result.nodes, links: result.links })
      } catch (err) { if (active) setError((err as Error).message) }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [importId])

  return { data, loading, error }
}
