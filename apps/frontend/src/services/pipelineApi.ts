const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

class PipelineApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'PipelineApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new PipelineApiError(body || res.statusText, res.status)
  }
  return res.json()
}

export const pipelineApi = {
  start: () => request<unknown>('/pipeline/start', { method: 'POST' }),
  pause: () => request<unknown>('/pipeline/pause', { method: 'POST' }),
  resume: () => request<unknown>('/pipeline/resume', { method: 'POST' }),
  next: () => request<unknown>('/pipeline/next', { method: 'POST' }),
  previous: () => request<unknown>('/pipeline/previous', { method: 'POST' }),
  replay: () => request<unknown>('/pipeline/replay', { method: 'POST' }),
  reset: () => request<unknown>('/pipeline/reset', { method: 'POST' }),
  getState: () => request<import('../types/pipeline').PipelineRun>('/pipeline/state'),
  getSnapshots: () =>
    request<import('../types/pipeline').StageSnapshot[]>('/pipeline/snapshots'),
}
