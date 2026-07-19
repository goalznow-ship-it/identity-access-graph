import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const auth = useAuth(), navigate = useNavigate(), location = useLocation()
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [submitting, setSubmitting] = useState(false), [error, setError] = useState('')
  if (!auth.loading && auth.user) return <Navigate to="/" replace />
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('')
    try { await auth.login(username.trim(), password); navigate((location.state as any)?.from || '/', { replace: true }) }
    catch (cause) { setError((cause as Error).message) }
    finally { setSubmitting(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-7 shadow-2xl"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Shield className="h-6 w-6" /></span><div><h1 className="text-xl font-semibold text-gray-100">Identity Access Graph</h1><p className="text-xs text-gray-500">Sign in to your enterprise workspace</p></div></div>{error&&<div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}<label className="block text-sm text-gray-300">Username<input autoFocus required autoComplete="username" value={username} onChange={event=>setUsername(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-gray-100 outline-none focus:border-primary" /></label><label className="block text-sm text-gray-300">Password<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-gray-100 outline-none focus:border-primary" /></label><button disabled={submitting||!username.trim()||!password} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting?'Signing in…':'Sign in'}</button></form></main>
}
