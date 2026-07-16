import type { CorrelationResult } from '../../types/import'

export function IdentityCorrelationSummary({ result }: { result: CorrelationResult }) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
    {(['identities', 'recordsMerged', 'EXACT', 'HIGH', 'CONFLICT'] as const).map((key) => <div key={key} className="rounded border border-border bg-card p-3"><div className="text-xs text-gray-500">{key}</div><div className="text-xl text-gray-100">{result.summary[key]}</div></div>)}
  </div>
}
