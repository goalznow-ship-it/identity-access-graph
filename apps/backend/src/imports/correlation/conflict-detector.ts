import type { CorrelationRecord } from './correlation-strategies'

const STRONG_FIELDS = ['objectGUID', 'sid']

export function detectStrongConflicts(records: CorrelationRecord[]): string[] {
  const conflicts: string[] = []
  for (const field of STRONG_FIELDS) {
    const values = new Set(records.map((record) => String(record.fields[field] ?? '').trim().toLowerCase()).filter(Boolean))
    if (values.size > 1) conflicts.push(`Conflicting ${field}: ${[...values].join(', ')}`)
  }
  return conflicts
}

export function conflictingFields(records: CorrelationRecord[]): string[] {
  const keys = new Set(records.flatMap((record) => Object.keys(record.fields)))
  return [...keys].filter((key) => {
    const values = new Set(records.map((record) => String(record.fields[key] ?? '').trim().toLowerCase()).filter(Boolean))
    return values.size > 1
  })
}
