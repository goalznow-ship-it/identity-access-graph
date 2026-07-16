import * as XLSX from 'xlsx'
import * as path from 'node:path'
import type { SheetInfo, SheetWarning } from '../types'

const MAX_ROWS = 50000
const MAX_PREVIEW = 20

export function parseExcel(filePath: string): SheetInfo[] {
  const workbook = XLSX.readFile(filePath, {
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellText: true,
    raw: true,
    type: 'file',
  })

  const sheets: SheetInfo[] = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: true,
    })

    if (jsonData.length === 0) {
      sheets.push({
        name: sheetName,
        rowCount: 0,
        columnCount: 0,
        headers: [],
        previewRows: [],
        warnings: [{ type: 'empty_sheet', message: `Sheet "${sheetName}" is empty.` }],
        classification: 'Unknown',
        classificationConfidence: 0,
      })
      continue
    }

    const headers = Object.keys(jsonData[0])
    const totalRows = jsonData.length
    const dataRows = jsonData.slice(0, MAX_ROWS)
    const previewRows = dataRows.slice(0, MAX_PREVIEW)

    const columnCount = headers.length
    const warnings: SheetWarning[] = []

    const emptyCols = headers.filter((h) => dataRows.every((r) => !r[h] || String(r[h]).trim() === ''))
    for (const col of emptyCols) {
      warnings.push({ type: 'empty_columns', message: `Column "${col}" is empty across all rows.`, column: col })
    }

    const seen = new Set<string>()
    let dupCount = 0
    for (const row of dataRows) {
      const key = headers.map((h) => String(row[h] ?? '')).join('|')
      if (seen.has(key)) dupCount++
      else seen.add(key)
    }
    if (dupCount > 0) {
      warnings.push({ type: 'duplicate_rows', message: `Found ${dupCount} duplicate row(s).`, count: dupCount })
    }

    sheets.push({
      name: sheetName,
      rowCount: totalRows,
      columnCount,
      headers,
      previewRows,
      warnings,
      classification: 'Unknown',
      classificationConfidence: 0,
    })
  }

  return sheets
}
