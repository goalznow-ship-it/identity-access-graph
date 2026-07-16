import type { ValidationIssue } from '../mapping/value-patterns'

export interface DuplicateInfo {
  id: string
  count: number
  rows: number[]
}

export function detectDuplicateValues(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Map<string, number[]>()

  rows.forEach((row, i) => {
    const val = String(row[column] ?? '').trim()
    if (!val) return
    if (!seen.has(val)) seen.set(val, [])
    seen.get(val)!.push(i + 1)
  })

  for (const [val, rowNumbers] of seen) {
    if (rowNumbers.length > 1) {
      issues.push({
        code: `DUP_${column.toUpperCase()}`,
        severity: 'ERROR',
        message: `Duplicate ${column}: "${val}" appears ${rowNumbers.length} times (rows ${rowNumbers.slice(0, 5).join(', ')}${rowNumbers.length > 5 ? `...` : ''})`,
        file,
        sheet,
        row: rowNumbers[0],
        sourceColumn: column,
        targetField: column,
        rawValue: val,
        suggestedResolution: `Ensure ${column} values are unique. Remove or deduplicate rows ${rowNumbers.join(', ')}.`,
      })
    }
  }

  return issues
}
