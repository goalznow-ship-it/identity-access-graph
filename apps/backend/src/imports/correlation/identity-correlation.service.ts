import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { STRATEGIES, compositeKey, type CorrelationConfidence, type CorrelationOptions, type CorrelationRecord, type MatchMethod } from './correlation-strategies'
import { detectStrongConflicts, conflictingFields } from './conflict-detector'
import { mergeFields } from './field-merger'

export interface CorrelationGroup {
  canonicalIdentityId: string
  matchedRecordIds: string[]
  sourceSystems: string[]
  matchMethod: MatchMethod
  confidence: CorrelationConfidence
  conflicts: string[]
  mergedFields: Record<string, unknown>
  conflictingFields: string[]
  manualReviewRequired: boolean
}

export interface CorrelationResult {
  importId: string
  groups: CorrelationGroup[]
  recordToCanonical: Record<string, string>
  summary: Record<CorrelationConfidence, number> & { records: number; identities: number; recordsMerged: number }
}

@Injectable()
export class IdentityCorrelationService {
  correlate(importId: string, records: CorrelationRecord[], options: CorrelationOptions = {}): CorrelationResult {
    const groups: { records: CorrelationRecord[]; method: MatchMethod; confidence: CorrelationConfidence; conflicts: string[] }[] = []
    for (const record of records) {
      let target: typeof groups[number] | undefined
      let method: MatchMethod = 'none'
      let confidence: CorrelationConfidence = 'LOW'
      for (const strategy of STRATEGIES) {
        const value = strategy.normalize(record.fields[strategy.field])
        if (!value) continue
        target = groups.find((group) => group.records.some((candidate) => strategy.normalize(candidate.fields[strategy.field]) === value))
        if (target) { method = strategy.method; confidence = strategy.confidence; break }
      }
      if (!target) {
        const key = compositeKey(record, options.compositeKeyFields)
        if (key) {
          target = groups.find((group) => compositeKey(group.records[0], options.compositeKeyFields) === key)
          if (target) { method = 'compositeKey'; confidence = 'LOW' }
        }
      }
      if (target) {
        const strongConflicts = detectStrongConflicts([...target.records, record])
        if (strongConflicts.length > 0) {
          target.confidence = 'CONFLICT'
          target.conflicts.push(...strongConflicts)
          groups.push({ records: [record], method: 'none', confidence: 'CONFLICT', conflicts: strongConflicts })
        } else {
          target.records.push(record)
          target.method = target.method === 'none' ? method : target.method
          target.confidence = strongConflicts.length ? 'CONFLICT' : confidence
        }
      } else groups.push({ records: [record], method: 'none', confidence: 'LOW', conflicts: [] })
    }

    const recordToCanonical: Record<string, string> = {}
    const resultGroups = groups.map((group) => {
      const merged = mergeFields(group.records)
      const conflicts = [...new Set([...group.conflicts, ...detectStrongConflicts(group.records)])]
      const fields = conflictingFields(group.records)
      const seed = String(merged.objectGUID ?? merged.sid ?? merged.employeeId ?? merged.email ?? merged.username ?? group.records[0].recordId)
      const canonicalIdentityId = `identity:${createHash('sha256').update(seed.toLowerCase()).digest('hex').slice(0, 24)}`
      group.records.forEach((record) => { recordToCanonical[record.recordId] = canonicalIdentityId })
      const missingName = !merged.displayName && !merged.firstName && !merged.username && !merged.email
      const employeeMismatch = group.method === 'employeeId' && fields.some((field) => ['username', 'samAccountName', 'userPrincipalName', 'email', 'displayName'].includes(field))
      const manualReviewRequired = conflicts.length > 0 || missingName || employeeMismatch || (group.method === 'username' && group.records.length > 1)
      return {
        canonicalIdentityId,
        matchedRecordIds: group.records.map((record) => record.recordId),
        sourceSystems: [...new Set(group.records.map((record) => record.sourceSystem))],
        matchMethod: group.method,
        confidence: conflicts.length ? 'CONFLICT' as const : group.confidence,
        conflicts,
        mergedFields: merged,
        conflictingFields: fields,
        manualReviewRequired,
      }
    })
    const summary = { EXACT: 0, HIGH: 0, MEDIUM: 0, LOW: 0, CONFLICT: 0, records: records.length, identities: resultGroups.length, recordsMerged: records.length - resultGroups.length }
    resultGroups.forEach((group) => { summary[group.confidence]++ })
    return { importId, groups: resultGroups, recordToCanonical, summary }
  }
}
