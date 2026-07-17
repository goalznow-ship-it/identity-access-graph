import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { CorrelationGroup } from '../../types/import'

export function CorrelationGroupCard({ group }: { group: CorrelationGroup }) {
  const [decision, setDecision] = useState<'accepted' | 'rejected' | 'split' | 'deferred' | null>(null)
  const strongConflict = group.confidence === 'CONFLICT' || group.conflictingFields.some((field) => ['employeeId', 'objectGUID', 'sid'].includes(field))
  return <div className="rounded border border-border p-3 text-xs">
    <div className="flex justify-between"><code>{group.canonicalIdentityId}</code><Badge variant={strongConflict ? 'danger' : 'secondary'}>{decision ?? group.confidence}</Badge></div>
    <p className="mt-2 text-gray-400">{group.matchedRecordIds.length} source account(s) via {group.matchMethod}; {group.sourceSystems.join(', ')}</p>
    {group.conflictingFields.length > 0 && <p className="mt-1 text-yellow-400">Conflicts: {group.conflictingFields.join(', ')}</p>}
    <div className="mt-2 flex flex-wrap gap-1">
      <Button size="sm" onClick={() => setDecision('accepted')} disabled={strongConflict}>Accept</Button>
      <Button size="sm" variant="ghost" onClick={() => setDecision('rejected')}>Reject</Button>
      <Button size="sm" variant="ghost" onClick={() => setDecision('split')}>Split</Button>
      <Button size="sm" variant="ghost" onClick={() => setDecision('deferred')}>Defer</Button>
    </div>
    {strongConflict && <p className="mt-2 text-red-400">Strong identifier conflict: automatic merge is disabled.</p>}
  </div>
}
