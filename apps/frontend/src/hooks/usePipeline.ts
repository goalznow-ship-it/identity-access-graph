import { useState, useCallback, useRef, useEffect } from 'react'
import type { PipelineRun, StageSnapshot } from '../types/pipeline'
import { pipelineApi } from '../services/pipelineApi'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface UsePipelineReturn {
  state: PipelineRun | null
  snapshots: StageSnapshot[]
  inputStatus: { ready: boolean; source: 'neo4j' | 'demo' | 'unavailable'; productionSafe: boolean; message: string } | null
  initialLoading: boolean
  loadError: string
  loading: Record<string, boolean>
  toasts: Toast[]
  removeToast: (id: number) => void
  start: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  replay: () => Promise<void>
  reset: () => Promise<void>
  refresh: () => Promise<void>
}

let toastId = 0

export function usePipeline(): UsePipelineReturn {
  const [state, setState] = useState<PipelineRun | null>(null)
  const [snapshots, setSnapshots] = useState<StageSnapshot[]>([])
  const [inputStatus, setInputStatus] = useState<UsePipelineReturn['inputStatus']>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message, type }])
    },
    [],
  )

  const withLoading = useCallback(
    async (key: string, fn: () => Promise<unknown>, successMsg?: string) => {
      setLoading((prev) => ({ ...prev, [key]: true }))
      try {
        await fn()
        if (successMsg) addToast(successMsg, 'success')
      } catch (err) {
        addToast((err as Error).message, 'error')
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }))
      }
    },
    [addToast],
  )

  const refresh = useCallback(async () => {
    try {
      setLoadError('')
      const [s, snap, input] = await Promise.all([
        pipelineApi.getState(),
        pipelineApi.getSnapshots(),
        pipelineApi.getInputStatus(),
      ])
      setState(s)
      setSnapshots(snap)
      setInputStatus(input)
    } catch (error) {
      setLoadError((error as Error).message)
    } finally {
      setInitialLoading(false)
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(refresh, 2000)
  }, [refresh])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const start = useCallback(async () => {
    await withLoading('start', () => pipelineApi.start(), 'Pipeline started')
    await refresh()
    startPolling()
  }, [withLoading, refresh, startPolling])

  const pause = useCallback(async () => {
    await withLoading('pause', () => pipelineApi.pause(), 'Pipeline paused')
    await refresh()
  }, [withLoading, refresh])

  const resume = useCallback(async () => {
    await withLoading('resume', () => pipelineApi.resume(), 'Pipeline resumed')
    await refresh()
    stopPolling()
  }, [withLoading, refresh, stopPolling])

  const next = useCallback(async () => {
    await withLoading('next', () => pipelineApi.next(), 'Stage completed')
    await refresh()
  }, [withLoading, refresh])

  const previous = useCallback(async () => {
    await withLoading('previous', () => pipelineApi.previous(), 'Stepped back')
    await refresh()
  }, [withLoading, refresh])

  const replay = useCallback(async () => {
    await withLoading('replay', () => pipelineApi.replay(), 'Replay completed')
    await refresh()
  }, [withLoading, refresh])

  const reset = useCallback(async () => {
    await withLoading('reset', () => pipelineApi.reset(), 'Pipeline reset')
    setState(null)
    setSnapshots([])
    stopPolling()
    await refresh()
  }, [withLoading, refresh, stopPolling])

  useEffect(() => {
    if (state?.status === 'RUNNING' || state?.status === 'PAUSED') {
      startPolling()
    } else {
      stopPolling()
    }
    return stopPolling
  }, [state?.status, startPolling, stopPolling])

  return {
    state,
    snapshots,
    inputStatus,
    initialLoading,
    loadError,
    loading,
    toasts,
    removeToast,
    start,
    pause,
    resume,
    next,
    previous,
    replay,
    reset,
    refresh,
  }
}
