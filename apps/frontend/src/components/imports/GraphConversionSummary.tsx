import type { ConversionResult } from '../../types/import'

export function GraphConversionSummary({ result }: { result: ConversionResult }) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[
    ['Nodes', result.nodesCreated], ['Relationships', result.relationshipsCreated], ['Merged', result.recordsMerged], ['Duplicates skipped', result.duplicateNodesSkipped],
  ].map(([label, value]) => <div key={String(label)} className="rounded border border-border bg-card p-3"><div className="text-xs text-gray-500">{label}</div><div className="text-xl text-gray-100">{value}</div></div>)}</div>
}
