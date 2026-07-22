import type { Connector, SyncRun } from '../types/connector'

const BASE = ((import.meta as any).env?.VITE_API_URL || '/api').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null
    const message = Array.isArray(payload?.message) ? payload.message.join('; ') : payload?.message
    throw new Error(message || `Connector request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const listConnectors = () => request<Connector[]>('/connectors')
export const createConnector = (body: Partial<Connector>) => request<Connector>('/connectors', { method: 'POST', body: JSON.stringify(body) })
export const updateConnector = (id: string, body: Partial<Connector>) => request<Connector>(`/connectors/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteConnector = (id: string) => request(`/connectors/${id}`, { method: 'DELETE' })
export const testConnector = (id: string) => request<{ connected: boolean; namingContexts: string[] }>(`/connectors/${id}/test`, { method: 'POST' })
export const previewConnector = (id: string) => request<SyncRun>(`/connectors/${id}/preview?limit=100`, { method: 'POST' })
export const syncConnector = (id: string) => request<SyncRun>(`/connectors/${id}/sync`, {
  method: 'POST',
  body: JSON.stringify({ mode: 'FULL', convert: true, persist: true, runRiskScan: true }),
})
export const connectorRuns = (id: string) => request<SyncRun[]>(`/connectors/${id}/sync-runs`)
