const BASE_URL = ((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/$/, '')

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
    let message = body
    try { const parsed = JSON.parse(body); message = Array.isArray(parsed.message) ? parsed.message.join('; ') : parsed.message || body } catch { /* plain-text response */ }
    throw new PipelineApiError(message || res.statusText, res.status)
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
  getInputStatus: () => request<{ ready: boolean; source: 'neo4j' | 'unavailable'; productionSafe: boolean; message: string }>('/pipeline/input-status'),
}
