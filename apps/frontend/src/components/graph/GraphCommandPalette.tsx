import { useEffect, useMemo, useRef, useState } from 'react'
import type { GraphData, GraphNode } from '../../types/graph'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

interface Props { data: GraphData; onSelect: (node: GraphNode) => void; onFit: () => void; onFullscreen: () => void; onClearFilters: () => void }
export function GraphCommandPalette({ data, onSelect, onFit, onFullscreen, onClearFilters }: Props) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const input = useRef<HTMLInputElement>(null); const debounced = useDebouncedValue(query)
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen((value) => !value) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])
  useEffect(() => { if (open) window.setTimeout(() => input.current?.focus(), 0) }, [open])
  const nodes = useMemo(() => {
    const value = debounced.trim().toLowerCase(); if (!value) return []
    return data.nodes.filter((node) => {
      const searchable = [node.displayName,node.id,node.sourceId,node.nodeType,node.properties.employeeId,node.properties.email,node.properties.username,node.properties.hostname,node.properties.applicationName,node.properties.databaseName,node.properties.groupName,node.properties.roleName]
      return searchable.some((item) => String(item ?? '').toLowerCase().includes(value))
    }).slice(0, 30)
  }, [data.nodes, debounced])
  if (!open) return null
  const close = () => { setOpen(false); setQuery('') }
  return <div className="fixed inset-0 z-[100] flex justify-center bg-black/60 pt-[12vh]" onMouseDown={close}><div className="h-fit w-[620px] max-w-[90vw] rounded-xl border border-border bg-surface shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, hosts, apps, databases, groups, roles, employee IDs, emails…" className="w-full border-b border-border bg-transparent p-4 text-sm outline-none"/><div className="max-h-96 overflow-auto p-2">{!query && <>{[['Fit graph',onFit],['Toggle fullscreen',onFullscreen],['Clear filters',onClearFilters]].map(([label,action]) => <button key={String(label)} onClick={() => { (action as () => void)(); close() }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-white/5">{String(label)}</button>)}</>}{nodes.map((node) => <button key={node.id} onClick={() => { onSelect(node); close() }} className="flex w-full justify-between rounded px-3 py-2 text-left text-sm hover:bg-white/5"><span>{node.displayName}</span><span className="text-xs text-gray-500">{node.nodeType}</span></button>)}</div><div className="border-t border-border px-3 py-2 text-[10px] text-gray-500">Ctrl+K to toggle · Esc/click outside to close</div></div></div>
}
