import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Bell, GitMerge, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getNotifications } from '../../services/notificationApi'
import type { NotificationItem } from '../../types/notification'
import { Panel } from './IdentityDistribution'

const icon = (type: string) => type === 'ATTACK_PATH' ? Shield : type === 'RISK_FINDING' || type === 'RISK_SCAN' ? AlertTriangle : type === 'IMPORT' ? GitMerge : type === 'SYSTEM' ? Bell : Activity
const relativeTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export function LatestChanges() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let cancelled = false; void getNotifications(0).then((page) => { if (!cancelled) setItems(page.items.slice(0, 6)) }).catch((cause) => { if (!cancelled) setError((cause as Error).message) }).finally(() => { if (!cancelled) setLoading(false) }); return () => { cancelled = true } }, [])
  return <Panel title="Latest Operational Changes">{loading ? <div aria-label="Loading latest changes" className="h-64 animate-pulse rounded bg-white/5" /> : error ? <p role="alert" className="py-8 text-center text-xs text-danger">{error}</p> : items.length === 0 ? <p className="py-8 text-center text-xs text-gray-500">No operational events have been recorded.</p> : <div className="space-y-1">{items.map((item) => { const Icon = icon(item.type); return <Link key={item.id} to={item.link || '/'} className="flex gap-3 border-l border-border py-2 pl-4 hover:bg-white/[.02] focus:outline-none focus:ring-1 focus:ring-primary"><span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><p className="text-xs font-medium text-gray-300">{item.title}</p><p className="truncate text-[10px] text-gray-500">{item.message}</p></div><time dateTime={item.createdAt} className="text-[10px] text-gray-600">{relativeTime(item.createdAt)}</time></Link> })}</div>}</Panel>
}
