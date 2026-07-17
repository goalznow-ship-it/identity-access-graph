import * as XLSX from 'xlsx'
import * as path from 'node:path'
import { IMPORT_CONFIG } from '../import-config'
import type { SheetInfo, SheetWarning } from '../types'

export function parseExcel(filePath: string): SheetInfo[] {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
    return []
  }

  const workbook = XLSX.readFile(filePath, {
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellText: true,
    raw: true,
    type: 'file',
  })

  const sheets: SheetInfo[] = []
  const sheetCount = Math.min(workbook.SheetNames.length, IMPORT_CONFIG.maxSheetsPerWorkbook)

  for (let si = 0; si < sheetCount; si++) {
    const sheetName = workbook.SheetNames[si]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: true,
    })

    if (jsonData.length === 0) {
      sheets.push(emptySheet(sheetName))
      continue
    }

    const headers = Object.keys(jsonData[0])
    const totalRows = Math.min(jsonData.length, IMPORT_CONFIG.maxRowsPerSheet)
    const dataRows = jsonData.slice(0, totalRows)
    const previewRows = dataRows.slice(0, IMPORT_CONFIG.previewRows)
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

    if (jsonData.length > IMPORT_CONFIG.maxRowsPerSheet) {
      warnings.push({
        type: 'truncated',
        message: `Row limit of ${IMPORT_CONFIG.maxRowsPerSheet} reached on sheet "${sheetName}"; truncated.`,
      })
    }

    sheets.push({
      name: sheetName,
      rowCount: totalRows,
      columnCount: headers.length,
      headers,
      previewRows,
      warnings,
      classification: 'Unknown',
      classificationConfidence: 0,
    })
  }

  return sheets
}

function emptySheet(sheetName: string): SheetInfo {
  return {
    name: sheetName,
    rowCount: 0,
    columnCount: 0,
    headers: [],
    previewRows: [],
    warnings: [{ type: 'empty_sheet', message: `Sheet "${sheetName}" is empty.` }],
    classification: 'Unknown',
    classificationConfidence: 0,
  }
}
