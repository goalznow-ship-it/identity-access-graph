import { normalizeStatus, normalizeRiskLevel, normalizeSourceSystem, normalizeEmail } from '../mapping/value-patterns'
import type { ColumnMapping } from '../mapping/mapping.service'

export interface NormalizedRecord {
  row: number
  original: Record<string, unknown>
  mapped: Record<string, unknown>
  identityKey: string
  warnings: string[]
  errors: string[]
}

export function generateNormalizedPreview(
  rows: Record<string, unknown>[],
  mappings: ColumnMapping[],
  maxRows = 20,
): NormalizedRecord[] {
  const result: NormalizedRecord[] = []
  const limit = Math.min(rows.length, maxRows)

  for (let i = 0; i < limit; i++) {
    const row = rows[i]
    const original = { ...row }
    const mapped: Record<string, unknown> = {}
    const warnings: string[] = []
    const errors: string[] = []

    for (const m of mappings) {
      if (m.ignored) continue
      const raw = String(row[m.sourceColumn] ?? '').trim()
      let normalized: unknown = raw

      switch (m.targetField) {
        case 'email':
          normalized = raw ? normalizeEmail(raw) : raw
          break
        case 'status':
          normalized = raw ? normalizeStatus(raw) : raw
          break
        case 'riskLevel':
          normalized = raw ? normalizeRiskLevel(raw) : raw
          break
        case 'sourceSystem':
          normalized = raw ? normalizeSourceSystem(raw) : raw
          break
      }

      if (m.duplicateTarget) {
        if (!warnings.includes(`Duplicate mapping for "${m.targetField}"`)) {
          warnings.push(`Duplicate mapping for "${m.targetField}"`)
        }
        continue
      }

      if (m.required && !raw) {
        errors.push(`Required field "${m.sourceColumn}" is empty`)
      }

      if (m.targetField !== 'id' && m.targetField !== 'externalId' && m.targetField !== 'ignored') {
        mapped[m.targetField] = normalized
      }
    }

    const identityKeyParts: string[] = []
    for (const key of ['employeeId', 'samAccountName', 'userPrincipalName', 'email', 'hostname', 'applicationName', 'databaseName', 'groupName', 'username']) {
      if (mapped[key]) identityKeyParts.push(String(mapped[key]))
    }
    if (mapped.displayName) identityKeyParts.push(String(mapped.displayName))

    result.push({
      row: i + 1,
      original,
      mapped,
      identityKey: identityKeyParts.join(' | ') || `row-${i + 1}`,
      warnings,
      errors,
    })
  }

  return result
}
