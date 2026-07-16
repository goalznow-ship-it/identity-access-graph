import type { CorrelationGroup } from '../../types/import'

export function CorrelationConflictList({ groups }: { groups: CorrelationGroup[] }) {
  const review = groups.filter((group) => group.manualReviewRequired)
  return <div className="space-y-2"><h3 className="text-sm font-medium">Manual review ({review.length})</h3>{review.map((group) => <div key={group.canonicalIdentityId} className="rounded border border-yellow-800 bg-yellow-900/10 p-3 text-xs text-yellow-200">{[...group.conflicts, ...(group.conflictingFields.length ? [`Conflicting fields: ${group.conflictingFields.join(', ')}`] : [])].join('; ') || 'Ambiguous match or missing canonical display name'}</div>)}</div>
}
