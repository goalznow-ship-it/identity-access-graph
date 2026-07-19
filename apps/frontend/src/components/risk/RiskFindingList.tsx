import type { FindingStatus, RiskFinding } from '../../types/risk'
import { RiskFindingCard } from './RiskFindingCard'

export function RiskFindingList({ findings, onSelect, onStatus }: {
  findings: RiskFinding[]
  onSelect: (finding: RiskFinding) => void
  onStatus?: (finding: RiskFinding, status: FindingStatus) => void
}) {
  if (!findings.length) return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-gray-500">No findings match the active filters.</div>
  return <div className="grid gap-3 xl:grid-cols-2">{findings.map(finding => <RiskFindingCard key={finding.id} finding={finding} onSelect={() => onSelect(finding)} onStatus={onStatus ? status => onStatus(finding, status) : undefined} />)}</div>
}
