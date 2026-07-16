import type { BlastRadiusResult } from '../../services/graphInvestigation'

export function BlastRadiusPanel({ result }: { result: BlastRadiusResult }) {
  return <div className="rounded border border-border bg-card p-3"><h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">Blast Radius</h4><div className="grid grid-cols-2 gap-2 text-xs">{Object.entries(result.counts).map(([label, count]) => <div key={label} className="flex justify-between"><span className="text-gray-500">{label}</span><span>{count}</span></div>)}</div></div>
}
