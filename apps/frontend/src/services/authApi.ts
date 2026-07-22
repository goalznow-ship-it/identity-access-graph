export type PlatformRole = 'VIEWER' | 'ANALYST' | 'ADMIN'
export interface SessionUser { id: string; username: string; displayName: string; role: PlatformRole }
export interface Session { user: SessionUser; authenticationEnabled: boolean }
export interface LoginResult { accessToken: string; expiresIn: number; user: SessionUser }
const ROLE_RANK: Record<PlatformRole, number> = { VIEWER: 1, ANALYST: 2, ADMIN: 3 }
export const hasMinimumRole = (actual: PlatformRole | undefined, required: PlatformRole) =>
  Boolean(actual && ROLE_RANK[actual] >= ROLE_RANK[required])

const TOKEN_KEY = 'iag-access-token'
const BASE = ((import.meta as any).env?.VITE_API_URL || '/api').replace(/\/$/, '')
export const getAccessToken = () => typeof sessionStorage === 'undefined' ? '' : sessionStorage.getItem(TOKEN_KEY) ?? ''
export const clearAccessToken = () => { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(TOKEN_KEY) }
export const storeAccessToken = (token: string) => { if (typeof sessionStorage !== 'undefined' && token) sessionStorage.setItem(TOKEN_KEY, token) }

export function installAuthenticatedFetch(target: typeof globalThis = globalThis) {
  const original = target.fetch.bind(target)
  target.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const isApi = url.startsWith('/') || Boolean(BASE && url.startsWith(BASE))
    const token = getAccessToken()
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    if (isApi && token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    const response = await original(input, { ...init, headers })
    if (isApi && response.status === 401 && !url.includes('/auth/login')) {
      clearAccessToken()
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('iag:unauthorized'))
    }
    return response
  }) as typeof fetch
  const download = (event: Event) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href*="/export?"]') as HTMLAnchorElement | null
    if (!anchor) return
    event.preventDefault()
    void target.fetch(anchor.href).then(async response => {
      if (!response.ok) throw new Error(`Export failed (${response.status})`)
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'identity-access-export'
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
    }).catch(error => window.dispatchEvent(new CustomEvent('iag:export-error', { detail: (error as Error).message })))
  }
  if (typeof document !== 'undefined') document.addEventListener('click', download)
  return () => { target.fetch = original; if (typeof document !== 'undefined') document.removeEventListener('click', download) }
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | T | null
  if (!response.ok) {
    const raw = (payload as any)?.message
    throw Object.assign(new Error(Array.isArray(raw) ? raw.join('; ') : raw || `Authentication request failed (${response.status})`), { status: response.status })
  }
  return payload as T
}

export async function login(username: string, password: string) {
  const result = await responseJson<LoginResult>(await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }))
  storeAccessToken(result.accessToken)
  return result
}
export const currentSession = () => fetch(`${BASE}/auth/me`).then(responseJson<Session>)
