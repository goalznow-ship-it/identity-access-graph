import type { CorrelationRecord } from './correlation-strategies'

const SOURCE_PRIORITY = ['MANUAL', 'ACTIVE_DIRECTORY', 'ENTRA_ID', 'FREE_IPA', 'LINUX', 'LDAP', 'CUSTOM']

export function mergeFields(records: CorrelationRecord[]): Record<string, unknown> {
  const ordered = [...records].sort((a, b) => {
    const ai = SOURCE_PRIORITY.indexOf(a.sourceSystem.toUpperCase())
    const bi = SOURCE_PRIORITY.indexOf(b.sourceSystem.toUpperCase())
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  })
  const merged: Record<string, unknown> = {}
  for (const record of ordered) {
    for (const [key, value] of Object.entries(record.fields)) {
      if ((merged[key] === undefined || merged[key] === '') && value !== undefined && value !== '') merged[key] = value
    }
  }
  return merged
}
