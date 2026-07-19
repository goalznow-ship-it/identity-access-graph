import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '../../pages/Identities'
import { explorerExportUrl, exploreNodes } from '../../services/explorerApi'
import type { GraphNode } from '../../types/graph'
import { useGraphData } from '../../hooks/useGraphData'
import { useGraphSource } from '../../hooks/useGraphSource'
import { Search } from '../icons'

type SortDirection = 'ASC' | 'DESC'

export function EntityExplorer({ title, subtitle, nodeTypes }: { title: string; subtitle: string; nodeTypes: string[] }) {
  const { source } = useGraphSource()
  const local = useGraphData(undefined, source === 'neo4j' ? 'mock' : source)
  const navigate = useNavigate()
  const [items, setItems] = useState<GraphNode[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [risk, setRisk] = useState('')
  const [system, setSystem] = useState('')
  const [sortBy, setSortBy] = useState('displayName')
  const [direction, setDirection] = useState<SortDirection>('ASC')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const limit = 25
  const nodeTypeKey = nodeTypes.join(',')

  const query = useMemo(
    () => ({
      q: search,
      nodeTypes,
      riskLevels: risk ? [risk] : [],
      sourceSystems: system ? [system] : [],
      sortBy,
      sortDirection: direction,
    }),
    [search, nodeTypeKey, risk, system, sortBy, direction],
  )

  useEffect(() => setOffset(0), [search, risk, system, sortBy, direction, nodeTypeKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const run = async () => {
      try {
        if (source === 'neo4j') {
          const page = await exploreNodes({ ...query, limit, offset })
          if (!cancelled) {
            setItems(page.items)
            setTotal(page.total)
          }
        } else {
          const all = (local.data?.nodes ?? [])
            .filter((node) => nodeTypes.includes(node.nodeType))
            .filter(
              (node) =>
                !search ||
                `${node.displayName} ${node.id} ${node.properties?.username ?? ''} ${node.properties?.email ?? ''}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .filter((node) => !risk || node.riskLevel === risk)
            .filter((node) => !system || node.sourceSystem === system)
            .sort(
              (a, b) =>
                String((a as unknown as Record<string, unknown>)[sortBy] ?? a.properties?.[sortBy] ?? '').localeCompare(
                  String((b as unknown as Record<string, unknown>)[sortBy] ?? b.properties?.[sortBy] ?? ''),
                ) * (direction === 'ASC' ? 1 : -1),
            )
          if (!cancelled) {
            setTotal(all.length)
            setItems(all.slice(offset, offset + limit))
          }
        }
      } catch (cause) {
        if (!cancelled) setError((cause as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (source !== 'neo4j' && local.loading) return
    void run()
    return () => {
      cancelled = true
    }
  }, [source, local.data, local.loading, query, offset, reload])

  const systems = useMemo(
    () => [...new Set((local.data?.nodes ?? []).map((node) => node.sourceSystem))].sort(),
    [local.data],
  )

  const destination = (node: GraphNode) =>
    ['USER', 'LINUX_USER'].includes(node.nodeType)
      ? `/identities/${encodeURIComponent(node.id)}`
      : `/graph?nodeId=${encodeURIComponent(node.id)}`

  return (
    <div className="space-y-5">
      <PageTitle title={title} subtitle={`${total} ${subtitle}`} />
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
        <label className="flex min-w-64 flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            aria-label={`Search ${title}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, identifier, username, or email"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select aria-label="Risk filter" value={risk} onChange={(event) => setRisk(event.target.value)} className="rounded border border-border bg-surface px-2 text-xs">
          <option value="">All risks</option>
          {['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <option key={value}>{value}</option>)}
        </select>
        {source === 'neo4j' ? <input aria-label="Source filter" value={system} onChange={(event) => setSystem(event.target.value)} placeholder="Source system" className="rounded border border-border bg-surface px-2 text-xs" /> : <select aria-label="Source filter" value={system} onChange={(event) => setSystem(event.target.value)} className="rounded border border-border bg-surface px-2 text-xs">
          <option value="">All sources</option>
          {systems.map((value) => <option key={value}>{value}</option>)}
        </select>}
        <select aria-label="Sort field" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded border border-border bg-surface px-2 text-xs">
          <option value="displayName">Name</option><option value="nodeType">Type</option><option value="sourceSystem">Source</option><option value="riskLevel">Risk</option><option value="status">Status</option>
        </select>
        <button onClick={() => setDirection((value) => (value === 'ASC' ? 'DESC' : 'ASC'))} className="rounded border border-border px-3 text-xs">
          {direction === 'ASC' ? 'Ascending' : 'Descending'}
        </button>
        {source === 'neo4j' ? (
          <>
            <a href={explorerExportUrl('nodes', 'json', query)} className="text-xs text-primary">JSON</a>
            <a href={explorerExportUrl('nodes', 'csv', query)} className="text-xs text-primary">CSV</a>
          </>
        ) : <span className="text-xs text-gray-500">Exports require Neo4j</span>}
      </div>
      {error && <div role="alert" className="rounded border border-danger/40 p-4 text-sm text-danger">{error}<button onClick={() => setReload((value) => value + 1)} className="ml-3 underline">Retry</button></div>}
      {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-gray-500">No records match the selected filters.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface text-gray-500"><tr>{['Name', 'Type', 'Username / ID', 'Status', 'Risk', 'Source'].map((value) => <th key={value} className="px-4 py-3">{value}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{items.map((node) => (
              <tr key={node.id} tabIndex={0} onClick={() => navigate(destination(node))} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(destination(node)) }} className="cursor-pointer hover:bg-white/[.03]">
                <td className="px-4 py-3 font-medium text-gray-200">{node.displayName}</td><td className="px-4">{node.nodeType}</td><td className="px-4 text-gray-400">{String(node.properties?.username ?? node.sourceId ?? node.id)}</td><td className="px-4">{String(node.properties?.status ?? '—')}</td><td className="px-4">{node.riskLevel}</td><td className="px-4">{node.sourceSystem}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{total ? `${offset + 1}–${Math.min(offset + items.length, total)} of ${total}` : '0 records'}</span>
        <div className="flex gap-2">
          <button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - limit))} className="rounded border border-border px-3 py-2 disabled:opacity-40">Previous</button>
          <button disabled={offset + items.length >= total || loading} onClick={() => setOffset(offset + limit)} className="rounded border border-border px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  )
}
