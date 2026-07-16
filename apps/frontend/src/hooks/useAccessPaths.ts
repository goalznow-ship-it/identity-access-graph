import { useMemo } from 'react'
import type { AccessPath } from '../types/identity'
import { buildUserProfile } from '../services/identityGraphAdapter'

export function useAccessPaths(userId: string | undefined): AccessPath[] {
  return useMemo(() => {
    if (!userId) return []
    const profile = buildUserProfile(userId)
    if (!profile) return []
    return profile.effectiveAccess.flatMap((a) => a.paths)
  }, [userId])
}
