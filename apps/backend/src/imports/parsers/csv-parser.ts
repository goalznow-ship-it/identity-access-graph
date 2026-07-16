import * as fs from 'node:fs'
import * as path from 'node:path'
import type { SheetInfo, SheetWarning } from '../types'

const MAX_ROWS = 50000
const MAX_PREVIEW = 20

export function parseCsv(filePath: string, sheetName: string): SheetInfo {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (lines.length === 0) {
    return {
      name: sheetName,
      rowCount: 0,
      columnCount: 0,
      headers: [],
      previewRows: [],
      warnings: [{ type: 'empty_sheet', message: 'CSV file is empty.' }],
      classification: 'Unknown',
      classificationConfidence: 0,
    }
  }

  const rows = lines.slice(0, MAX_ROWS + 1).map((line) => parseCsvLine(line))
  const headers = rows[0]
  const dataRows = rows.slice(1)
  const totalRows = lines.length - 1

  const previewRows = dataRows.slice(0, MAX_PREVIEW).map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? null })
    return obj
  })

  const warnings: SheetWarning[] = []
  const columnCount = headers.length

  const emptyCols = headers.filter((_, i) => dataRows.every((r) => !r[i] || String(r[i]).trim() === ''))
  for (const col of emptyCols) {
    warnings.push({ type: 'empty_columns', message: `Column "${col}" is empty across all rows.`, column: col })
  }

  const seen = new Set<string>()
  let dupCount = 0
  for (const row of dataRows) {
    const key = row.join('|')
    if (seen.has(key)) dupCount++
    else seen.add(key)
  }
  if (dupCount > 0) {
    warnings.push({ type: 'duplicate_rows', message: `Found ${dupCount} duplicate row(s).`, count: dupCount })
  }

  return {
    name: sheetName,
    rowCount: totalRows,
    columnCount,
    headers,
    previewRows,
    warnings,
    classification: 'Unknown',
    classificationConfidence: 0,
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}
