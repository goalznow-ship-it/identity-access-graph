import { useState, useEffect } from 'react'
import type { UserProfileData } from '../types/identity'
import type { GraphData } from '../types/graph'
import { buildUserProfile, setGraphData } from '../services/identityGraphAdapter'

interface UseUserProfileReturn {
  profile: UserProfileData | null
  loading: boolean
  error: string | null
}

export function useUserProfile(
  userId: string | undefined,
  data: GraphData | null,
  sourceLoading = false,
  sourceError: string | null = null,
): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setError('No user ID provided')
      setLoading(false)
      return
    }
    if (sourceLoading) {
      setLoading(true)
      setError(null)
      return
    }
    if (sourceError) {
      setProfile(null)
      setError(sourceError)
      setLoading(false)
      return
    }
    if (!data) {
      setProfile(null)
      setError('The selected graph dataset is not available')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      setGraphData(data)
      const result = buildUserProfile(userId)
      if (!result) {
        setError(`User "${userId}" not found`)
      } else {
        setProfile(result)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [userId, data, sourceLoading, sourceError])

  return { profile, loading, error }
}
