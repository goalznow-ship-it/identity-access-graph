import { useState, useEffect } from 'react'
import type { GraphData } from '../types/graph'
import { buildGraphData } from '../services/graphDataAdapter'

interface UseGraphDataReturn {
  data: GraphData | null
  loading: boolean
  error: string | null
}

export function useGraphData(): UseGraphDataReturn {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const result = buildGraphData()
      setData(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error }
}
