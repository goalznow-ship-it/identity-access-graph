import { NODE_TYPE_COLORS } from '../../services/graphDataAdapter'

const COLOR_LABELS: Record<string, string> = {
  '#3b82f6': 'User',
  '#22c55e': 'Group',
  '#f97316': 'Role',
  '#eab308': 'Permission',
  '#a855f7': 'Host / Computer',
  '#06b6d4': 'Application',
  '#ec4899': 'Database',
  '#6366f1': 'Department / Team',
  '#ef4444': 'Business Service',
  '#6b7280': 'Forest / Domain / OU',
  '#8b5cf6': 'Service Account',
  '#78716c': 'Infrastructure',
  '#14b8a6': 'Linux Entities',
}

export function GraphLegend() {
  const seen = new Set<string>()

  return (
    <div className="space-y-1.5">
      <div className="mb-2 grid grid-cols-2 gap-1 border-b border-border pb-2 text-[10px] text-gray-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-white"/>Selected</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500"/>Upstream</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500"/>Downstream</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500"/>Attack path</span></div>
      {Object.entries(NODE_TYPE_COLORS).map(([type, color]) => {
        const label = COLOR_LABELS[color]
        if (!label || seen.has(color)) return null
        seen.add(color)
        return (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-400">{label}</span>
          </div>
        )
      })}
      <div className="border-t border-border pt-2 text-[10px] text-gray-500"><span className="mr-2">→ Directed relationship</span><span>Label hidden on dense graphs</span></div>
    </div>
  )
}
