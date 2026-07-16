import type { ValidationIssue } from '../mapping/value-patterns'

export function validateReferences(
  rows: Record<string, unknown>[],
  column: string,
  referenceField: string,
  knownValues: Set<string>,
  file: string,
  sheet: string,
  label: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  rows.forEach((row, i) => {
    const raw = String(row[column] ?? '').trim()
    if (!raw) return
    const values = raw.split(/[;,|]/).map((value) => value.trim()).filter(Boolean)
    for (const val of values) {
      if (knownValues.has(val)) continue
      issues.push({
        code: `UNRESOLVED_${referenceField.toUpperCase()}`,
        severity: 'WARNING',
        message: `Unresolved ${label}: "${val}" not found in ${referenceField} records`,
        file,
        sheet,
        row: i + 1,
        sourceColumn: column,
        targetField: referenceField,
        rawValue: val,
        suggestedResolution: `Ensure "${val}" exists in the ${label} dataset or correct the reference.`,
      })
    }
  })

  return issues
}
