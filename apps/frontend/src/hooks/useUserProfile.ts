import { useState, useEffect } from 'react'
import type { UserProfileData } from '../types/identity'
import { buildUserProfile } from '../services/identityGraphAdapter'

interface UseUserProfileReturn {
  profile: UserProfileData | null
  loading: boolean
  error: string | null
}

export function useUserProfile(userId: string | undefined): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setError('No user ID provided')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
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
  }, [userId])

  return { profile, loading, error }
}
