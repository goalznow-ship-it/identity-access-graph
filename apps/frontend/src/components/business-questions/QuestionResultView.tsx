import type { QuestionResult } from '../../types/businessQuestions'
import { QuestionStatCards } from './QuestionStatCards'
import { QuestionPathList } from './QuestionPathList'
import { QuestionAffectedTable } from './QuestionAffectedTable'
import { QuestionRiskList } from './QuestionRiskList'
import { QuestionRawTable } from './QuestionRawTable'

interface QuestionResultViewProps {
  result: QuestionResult | null
  loading: boolean
}

export function QuestionResultView({ result, loading }: QuestionResultViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
      </div>
    )
  }

  if (!result) return null

  const hasAffected = result.affectedIdentities.length > 0 || result.affectedSystems.length > 0 || result.affectedBusinessServices.length > 0
  const hasPaths = result.paths.length > 0
  const hasRisks = result.riskFindings.length > 0
  const hasRaw = result.rawData.length > 0

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-gray-100">{result.title}</h2>
        <p className="mt-1 text-sm text-gray-400">{result.summary}</p>
      </div>

      <QuestionStatCards stats={result.statistics} />

      {hasRisks && <QuestionRiskList findings={result.riskFindings} />}

      {hasPaths && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-300">Access Paths ({result.paths.length})</h3>
          <QuestionPathList paths={result.paths} />
        </div>
      )}

      {hasAffected && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {result.affectedIdentities.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">Identities</h4>
              <QuestionAffectedTable items={result.affectedIdentities} />
            </div>
          )}
          {result.affectedSystems.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">Systems</h4>
              <QuestionAffectedTable items={result.affectedSystems} />
            </div>
          )}
          {result.affectedBusinessServices.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">Business Services</h4>
              <QuestionAffectedTable items={result.affectedBusinessServices} />
            </div>
          )}
        </div>
      )}

      {hasRaw && <QuestionRawTable data={result.rawData} />}
    </div>
  )
}
