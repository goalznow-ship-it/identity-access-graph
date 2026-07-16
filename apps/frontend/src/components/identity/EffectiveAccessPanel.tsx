import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { EffectiveAccess } from '../../types/identity'

interface EffectiveAccessPanelProps {
  access: EffectiveAccess[]
}

const typeColors: Record<string, string> = {
  APPLICATION: '#06b6d4',
  DATABASE: '#ec4899',
  BUSINESS_SERVICE: '#ef4444',
  HOST: '#a855f7',
  COMPUTER: '#a855f7',
  SUDO_POLICY: '#14b8a6',
  SSH_KEY: '#14b8a6',
}

export function EffectiveAccessPanel({ access }: EffectiveAccessPanelProps) {
  if (access.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No effective access found.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {access.map((item) => (
        <Card key={`${item.type}:${item.targetId}`} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: typeColors[item.targetType] ?? '#6b7280' }} />
              <div>
                <p className="text-sm font-medium text-gray-200">{item.targetName}</p>
                <p className="text-xs text-gray-500">{item.targetType} · {item.sourceSystem}</p>
              </div>
            </div>
            <Badge variant={
              item.riskLevel === 'CRITICAL' || item.riskLevel === 'HIGH' ? 'danger' :
              item.riskLevel === 'MEDIUM' ? 'warning' : 'success'
            }>
              {item.riskLevel}
            </Badge>
          </div>
          {item.paths.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs text-gray-500">{item.paths.length} path(s)</p>
              {item.paths.slice(0, 3).map((path, i) => (
                <div key={i} className="mb-1 flex flex-wrap items-center gap-1 text-xs text-gray-400">
                  {path.nodes.map((pn, j) => (
                    <span key={pn.id}>
                      <span className="text-gray-300">{pn.displayName}</span>
                      {j < path.nodes.length - 1 && (
                        <span className="mx-1 text-gray-600">{pn.relationshipType} →</span>
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
