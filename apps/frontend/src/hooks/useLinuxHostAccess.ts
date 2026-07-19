import { useState, useEffect, useMemo } from 'react'
import type { LinuxHostDetail, EffectiveAccessEntry, ReverseAccessSummary, DependencyNode, LinuxRiskFinding } from '../types/linux'
import { getHostDetail, computeEffectiveAccess, computeReverseAccessSummary, computeDependencyNodes, computeRiskFindingsForHost } from '../services/linuxGraphAdapter'

export function useLinuxHostAccess(hostId: string | null, graphRevision = 0) {
  const [detail, setDetail] = useState<LinuxHostDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hostId) {
      setDetail(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = getHostDetail(hostId)
      if (!result) {
        setError('Host not found')
      } else {
        setDetail(result)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load host detail')
    } finally {
      setLoading(false)
    }
  }, [hostId, graphRevision])

  const effectiveAccess = useMemo((): EffectiveAccessEntry[] => {
    if (!hostId) return []
    return computeEffectiveAccess(hostId)
  }, [hostId, graphRevision])

  const reverseAccess = useMemo((): ReverseAccessSummary | null => {
    if (!hostId) return null
    return computeReverseAccessSummary(hostId)
  }, [hostId, graphRevision])

  const dependencies = useMemo((): DependencyNode[] => {
    if (!hostId) return []
    return computeDependencyNodes(hostId)
  }, [hostId, graphRevision])

  const riskFindings = useMemo((): LinuxRiskFinding[] => {
    if (!hostId) return []
    return computeRiskFindingsForHost(hostId)
  }, [hostId, graphRevision])

  return {
    detail, loading, error,
    effectiveAccess, reverseAccess, dependencies, riskFindings,
  }
}
