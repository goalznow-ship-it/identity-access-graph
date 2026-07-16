import type { LinuxRiskFinding } from '../../types/linux'

const severityConfig = {
  low: { bg: 'bg-gray-900/40', border: 'border-gray-700', icon: '●', iconColor: 'text-gray-400', labelColor: 'text-gray-400' },
  medium: { bg: 'bg-yellow-900/20', border: 'border-yellow-700', icon: '◆', iconColor: 'text-yellow-400', labelColor: 'text-yellow-400' },
  high: { bg: 'bg-red-900/20', border: 'border-red-700', icon: '▲', iconColor: 'text-red-400', labelColor: 'text-red-400' },
  critical: { bg: 'bg-red-950/30', border: 'border-red-600', icon: '■', iconColor: 'text-red-300', labelColor: 'text-red-300' },
}

interface LinuxRiskFindingsProps {
  findings: LinuxRiskFinding[]
}

export function LinuxRiskFindings({ findings }: LinuxRiskFindingsProps) {
  if (findings.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-500">No risk findings detected.</p>
  }

  const grouped = { critical: [] as LinuxRiskFinding[], high: [] as LinuxRiskFinding[], medium: [] as LinuxRiskFinding[], low: [] as LinuxRiskFinding[] }
  for (const f of findings) grouped[f.severity].push(f)

  return (
    <div className="space-y-3">
      {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
        const items = grouped[sev]
        if (items.length === 0) return null
        const cfg = severityConfig[sev]
        return (
          <div key={sev}>
            <h4 className={`mb-1.5 text-xs font-semibold uppercase tracking-wider ${cfg.labelColor}`}>
              {sev.toUpperCase()} ({items.length})
            </h4>
            <div className="space-y-1.5">
              {items.map((f) => (
                <div key={`${f.type}-${f.relatedNodes.join(',')}`} className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-sm ${cfg.iconColor}`}>{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-100">{f.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{f.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
