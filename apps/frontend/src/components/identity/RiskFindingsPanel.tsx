import { AlertTriangle, Shield, Skull, Info } from 'lucide-react'
import { Card } from '../ui/Card'
import type { RiskFinding } from '../../types/identity'

interface RiskFindingsPanelProps {
  findings: RiskFinding[]
}

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  low: { icon: Info, color: 'text-info', bg: 'bg-info-muted' },
  medium: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-muted' },
  high: { icon: Shield, color: 'text-danger', bg: 'bg-danger-muted' },
  critical: { icon: Skull, color: 'text-danger', bg: 'bg-danger-muted' },
}

export function RiskFindingsPanel({ findings }: RiskFindingsPanelProps) {
  if (findings.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No risk findings for this user.</p>
      </Card>
    )
  }

  const grouped = {
    critical: findings.filter((f) => f.severity === 'critical'),
    high: findings.filter((f) => f.severity === 'high'),
    medium: findings.filter((f) => f.severity === 'medium'),
    low: findings.filter((f) => f.severity === 'low'),
  }

  const order = ['critical', 'high', 'medium', 'low'] as const

  return (
    <div className="space-y-3">
      {order.map((sev) => {
        const items = grouped[sev]
        if (items.length === 0) return null
        const cfg = severityConfig[sev]

        return (
          <div key={sev}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {sev.toUpperCase()} ({items.length})
            </p>
            <div className="space-y-2">
              {items.map((f, i) => {
                const Icon = cfg.icon
                return (
                  <Card key={`${f.type}-${i}`} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-200">{f.title}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{f.description}</p>
                        {f.relatedNodes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {f.relatedNodes.map((rid) => (
                              <span key={rid} className="rounded bg-card px-2 py-0.5 text-xs text-gray-500">
                                {rid}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
