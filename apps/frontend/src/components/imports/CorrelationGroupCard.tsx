import { Badge } from '../ui/Badge'
import type { CorrelationGroup } from '../../types/import'

export function CorrelationGroupCard({ group }: { group: CorrelationGroup }) {
  return <div className="rounded border border-border p-3 text-xs"><div className="flex justify-between"><code>{group.canonicalIdentityId}</code><Badge variant={group.confidence === 'CONFLICT' ? 'danger' : 'secondary'}>{group.confidence}</Badge></div><p className="mt-2 text-gray-400">{group.matchedRecordIds.length} record(s) via {group.matchMethod}; {group.sourceSystems.join(', ')}</p></div>
}
