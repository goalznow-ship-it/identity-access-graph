import type { UnresolvedReference } from '../../types/import'

export function UnresolvedReferenceList({ items }: { items: UnresolvedReference[] }) {
  return <div><h3 className="mb-2 text-sm font-medium">Unresolved references ({items.length})</h3><div className="max-h-48 space-y-1 overflow-auto">{items.map((item, index) => <div key={`${item.recordId}-${item.field}-${index}`} className="rounded bg-gray-900 p-2 text-xs text-gray-400">{item.field}: {item.value} — {item.reason}</div>)}</div></div>
}
