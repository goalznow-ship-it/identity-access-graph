import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { GraphNode, GraphData } from '../../types/graph'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

interface GraphSearchProps {
  data: GraphData | null
  onSelect: (node: GraphNode) => void
}

export function GraphSearch({ data, onSelect }: GraphSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)

  const results = useMemo(() => {
    if (!debouncedQuery.trim() || !data) return []
    const q = debouncedQuery.toLowerCase()
    return data.nodes
      .filter(
        (n) =>
          n.displayName.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          Boolean(n.sourceId && n.sourceId.toLowerCase().includes(q)) ||
          String(n.properties.employeeId ?? '').toLowerCase().includes(q) ||
          String(n.properties.email ?? '').toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [debouncedQuery, data])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 focus:border-primary focus:outline-none"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-glass">
          {results.map((node) => (
            <button
              key={node.id}
              onClick={() => {
                onSelect(node)
                setQuery('')
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5"
            >
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getSearchColor(node.nodeType) }}
              />
              <div className="min-w-0 flex-1 truncate">
                <span className="font-medium text-gray-200">{node.displayName}</span>
                <span className="ml-2 text-gray-500">{node.nodeType}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getSearchColor(type: string): string {
  switch (type) {
    case 'USER': return '#3b82f6'
    case 'GROUP': return '#22c55e'
    default: return '#6b7280'
  }
}
