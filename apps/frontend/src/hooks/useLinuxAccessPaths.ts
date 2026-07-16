import { useMemo } from 'react'
import type { AccessPathEntry } from '../types/linux'
import { computeEffectiveAccess } from '../services/linuxGraphAdapter'

export function useLinuxAccessPaths(hostId: string | null) {
  const allPaths = useMemo((): AccessPathEntry[] => {
    if (!hostId) return []
    const entries = computeEffectiveAccess(hostId)
    const paths: AccessPathEntry[] = []
    for (const e of entries) {
      for (const p of e.accessPaths) {
        paths.push(p)
      }
    }
    return paths
  }, [hostId])

  const uniqueNodes = useMemo(() => {
    const map = new Map<string, { id: string; displayName: string; nodeType: string }>()
    for (const path of allPaths) {
      for (const n of path.nodes) {
        if (n.id && !map.has(n.id)) {
          map.set(n.id, { id: n.id, displayName: n.displayName, nodeType: n.nodeType })
        }
      }
    }
    return Array.from(map.values())
  }, [allPaths])

  return { allPaths, uniqueNodes }
}
