import { useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { AccessPath } from './AccessPath'
import type { EffectiveAccess, AccessPath as AccessPathType } from '../../types/identity'

interface AccessPathExplorerProps {
  access: EffectiveAccess[]
}

const typeLabels: Record<string, string> = {
  APPLICATION: 'Applications',
  DATABASE: 'Databases',
  BUSINESS_SERVICE: 'Business Services',
  HOST: 'Hosts',
  COMPUTER: 'Computers',
  SUDO_POLICY: 'Sudo Policies',
  SSH_KEY: 'SSH Keys',
}

export function AccessPathExplorer({ access }: AccessPathExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string | null>(null)

  const grouped = access.reduce<Record<string, EffectiveAccess[]>>((acc, item) => {
    const key = item.targetType
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  const filtered = filterType
    ? { [filterType]: grouped[filterType] ?? [] }
    : grouped

  if (access.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No access paths found.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !filterType ? 'bg-primary-muted text-primary' : 'bg-card text-gray-400 hover:text-gray-200'
          }`}
        >
          All
        </button>
        {Object.keys(grouped).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === type ? 'bg-primary-muted text-primary' : 'bg-card text-gray-400 hover:text-gray-200'
            }`}
          >
            {typeLabels[type] ?? type} ({grouped[type].length})
          </button>
        ))}
      </div>

      {Object.entries(filtered).map(([type, items]) => (
        <div key={type}>
          <p className="mb-2 text-sm font-medium text-gray-300">
            {typeLabels[type] ?? type} ({items.length})
          </p>
          <div className="space-y-2">
            {items.map((item) => {
              const isExpanded = expanded.has(item.targetId)
              return (
                <div key={item.targetId}>
                  <button
                    onClick={() => {
                      const next = new Set(expanded)
                      if (isExpanded) next.delete(item.targetId)
                      else next.add(item.targetId)
                      setExpanded(next)
                    }}
                    className="flex w-full items-center justify-between rounded-lg bg-card px-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{item.targetName}</span>
                      <Badge variant={item.riskLevel === 'CRITICAL' ? 'danger' : item.riskLevel === 'HIGH' ? 'warning' : 'success'}>
                        {item.riskLevel}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {item.paths.length} path{item.paths.length > 1 ? 's' : ''}
                      <svg
                        className={`ml-1 inline h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-2 pl-4">
                      {item.paths.map((path: AccessPathType, i: number) => (
                        <AccessPath key={i} nodes={path.nodes} direct={path.direct} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
