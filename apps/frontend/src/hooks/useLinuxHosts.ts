import { useState, useEffect, useMemo } from 'react'
import type { LinuxHostSummary, LinuxHostFilters } from '../types/linux'
import { getLinuxHostsByFilter } from '../services/linuxGraphAdapter'

export function useLinuxHosts(filters: LinuxHostFilters, search: string, graphRevision = 0) {
  const [hosts, setHosts] = useState<LinuxHostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    try {
      const result = getLinuxHostsByFilter({ ...filters, search })
      setHosts(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Linux hosts')
    } finally {
      setLoading(false)
    }
  }, [
    filters.environment.join(','),
    filters.operatingSystem.join(','),
    filters.sourceSystem.join(','),
    filters.riskLevel.join(','),
    filters.sshAccess,
    filters.sudoAccess,
    filters.privilegedAccess,
    filters.hasApplication,
    filters.hasDatabase,
    search,
    graphRevision,
  ])

  const uniqueEnvironments = useMemo(() => {
    const s = new Set(hosts.map((h) => h.environment))
    return Array.from(s).sort()
  }, [hosts])

  const uniqueOperatingSystems = useMemo(() => {
    const s = new Set(hosts.map((h) => h.operatingSystem))
    return Array.from(s).sort()
  }, [hosts])

  const uniqueSourceSystems = useMemo(() => {
    const s = new Set(hosts.map((h) => h.sourceSystem))
    return Array.from(s)
  }, [hosts])

  return { hosts, loading, error, uniqueEnvironments, uniqueOperatingSystems, uniqueSourceSystems }
}
