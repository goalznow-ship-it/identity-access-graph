import type {
  EnterpriseIdentity,
  MergeConflict,
  IdentityTimelineEvent,
  MergeStatistics,
  CorrelationRequest,
  CorrelationResult,
  MergePreview,
} from '../types/enterprise-identity'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function listEnterpriseIdentities(): Promise<EnterpriseIdentity[]> {
  return fetchApi<EnterpriseIdentity[]>('/identity/enterprise')
}

export async function getEnterpriseIdentity(id: string): Promise<EnterpriseIdentity> {
  return fetchApi<EnterpriseIdentity>(`/identity/enterprise/${id}`)
}

export async function correlateEnterprise(request: CorrelationRequest): Promise<CorrelationResult> {
  return fetchApi<CorrelationResult>('/identity/enterprise/correlate', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function mergeEnterpriseIdentity(id: string, node: Record<string, unknown>): Promise<EnterpriseIdentity> {
  return fetchApi<EnterpriseIdentity>(`/identity/enterprise/${id}/merge`, {
    method: 'POST',
    body: JSON.stringify({ node }),
  })
}

export async function getMergePreview(id: string, targetId?: string): Promise<MergePreview> {
  const params = targetId ? `?targetId=${targetId}` : ''
  return fetchApi<MergePreview>(`/identity/enterprise/${id}/merge-preview${params}`)
}

export async function getEnterpriseConflicts(id: string): Promise<MergeConflict[]> {
  return fetchApi<MergeConflict[]>(`/identity/enterprise/${id}/conflicts`)
}

export async function getEnterpriseTimeline(id: string): Promise<IdentityTimelineEvent[]> {
  return fetchApi<IdentityTimelineEvent[]>(`/identity/enterprise/${id}/timeline`)
}

export async function getEnterpriseStatistics(id: string): Promise<MergeStatistics> {
  return fetchApi<MergeStatistics>(`/identity/enterprise/${id}/statistics`)
}
