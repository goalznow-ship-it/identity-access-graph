import { Card } from '../ui/Card'

interface RawPropertiesPanelProps {
  properties: Record<string, unknown>
}

const SKIP_KEYS = new Set(['id', 'displayName', 'nodeType', 'sourceSystem', 'riskLevel', 'metadata', 'createdAt', 'updatedAt', 'status', 'enabled', 'deleted', 'critical'])

export function RawPropertiesPanel({ properties }: RawPropertiesPanelProps) {
  const entries = Object.entries(properties).filter(([k]) => !SKIP_KEYS.has(k))

  if (entries.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No additional properties.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex rounded-lg bg-card px-3 py-2">
          <span className="w-1/3 shrink-0 text-xs font-medium text-gray-400">{key}</span>
          <span className="text-xs text-gray-200">
            {value === null || value === undefined
              ? '—'
              : typeof value === 'object'
                ? JSON.stringify(value, null, 1)
                : String(value)}
          </span>
        </div>
      ))}
    </div>
  )
}
