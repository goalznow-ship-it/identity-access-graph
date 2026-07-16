import type { QuestionRiskFinding } from '../../types/businessQuestions'

interface QuestionRiskListProps {
  findings: QuestionRiskFinding[]
}

const severityConfig = {
  low: { bg: 'bg-gray-900/40', border: 'border-gray-700', icon: '●', iconColor: 'text-gray-400', label: 'text-gray-400' },
  medium: { bg: 'bg-yellow-900/20', border: 'border-yellow-700', icon: '◆', iconColor: 'text-yellow-400', label: 'text-yellow-400' },
  high: { bg: 'bg-red-900/20', border: 'border-red-700', icon: '▲', iconColor: 'text-red-400', label: 'text-red-400' },
  critical: { bg: 'bg-red-950/30', border: 'border-red-600', icon: '■', iconColor: 'text-red-300', label: 'text-red-300' },
}

export function QuestionRiskList({ findings }: QuestionRiskListProps) {
  const grouped = { critical: [] as QuestionRiskFinding[], high: [] as QuestionRiskFinding[], medium: [] as QuestionRiskFinding[], low: [] as QuestionRiskFinding[] }
  for (const f of findings) grouped[f.severity].push(f)

  return (
    <div className="space-y-3">
      {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
        const items = grouped[sev]
        if (items.length === 0) return null
        const cfg = severityConfig[sev]
        return (
          <div key={sev}>
            <h4 className={`mb-1.5 text-xs font-semibold uppercase tracking-wider ${cfg.label}`}>
              {sev.toUpperCase()} ({items.length})
            </h4>
            <div className="space-y-1.5">
              {items.map((f, i) => (
                <div key={i} className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-sm ${cfg.iconColor}`}>{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-100">{f.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{f.description}</p>
                    </div>
                    {f.count > 1 && (
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">{f.count}</span>
                    )}
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
