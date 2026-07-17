import * as fs from 'node:fs'
import * as path from 'node:path'
import { IMPORT_CONFIG } from '../import-config'
import type { SheetInfo, SheetWarning } from '../types'

export function parseJson(filePath: string, sheetName: string): SheetInfo {
  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  if (!raw) return emptyResult(sheetName, 'JSON file is empty.')

  const ext = path.extname(filePath).toLowerCase()
  const isNdjson = ext === '.jsonl' || ext === '.ndjson'
  const rows: Record<string, unknown>[] = []

  if (isNdjson) {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
    for (const line of lines.slice(0, IMPORT_CONFIG.maxRowsPerSheet)) {
      try {
        const parsed = JSON.parse(line)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          rows.push(parsed as Record<string, unknown>)
        }
      } catch { /* skip malformed lines */ }
    }
  } else {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (const item of parsed.slice(0, IMPORT_CONFIG.maxRowsPerSheet)) {
          if (item && typeof item === 'object') {
            rows.push(item as Record<string, unknown>)
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        rows.push(parsed as Record<string, unknown>)
      }
    } catch {
      // Not valid JSON array, try NDJSON fallback
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
      for (const line of lines.slice(0, IMPORT_CONFIG.maxRowsPerSheet)) {
        try {
          const parsed = JSON.parse(line)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            rows.push(parsed as Record<string, unknown>)
          }
        } catch { /* skip */ }
      }
    }
  }

  if (rows.length === 0) return emptyResult(sheetName, 'No valid JSON objects found.')

  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const totalRows = rows.length
  const previewRows = rows.slice(0, IMPORT_CONFIG.previewRows)
  const warnings: SheetWarning[] = []
  const truncated = totalRows >= IMPORT_CONFIG.maxRowsPerSheet

  const emptyCols = headers.filter((h) => rows.every((r) => !r[h] || String(r[h]).trim() === ''))
  for (const col of emptyCols) {
    warnings.push({ type: 'empty_columns', message: `Column "${col}" is empty across all rows.`, column: col })
  }

  const seen = new Set<string>()
  let dupCount = 0
  for (const row of rows) {
    const key = headers.map((h) => String(row[h] ?? '')).join('|')
    if (seen.has(key)) dupCount++
    else seen.add(key)
  }
  if (dupCount > 0) {
    warnings.push({ type: 'duplicate_rows', message: `Found ${dupCount} duplicate row(s).`, count: dupCount })
  }
  if (truncated) {
    warnings.push({ type: 'truncated', message: `Row limit of ${IMPORT_CONFIG.maxRowsPerSheet} reached; file truncated.` })
  }

  return {
    name: sheetName,
    rowCount: totalRows,
    columnCount: headers.length,
    headers,
    previewRows,
    warnings,
    classification: 'Unknown',
    classificationConfidence: 0,
  }
}

function emptyResult(sheetName: string, msg: string): SheetInfo {
  return {
    name: sheetName,
    rowCount: 0,
    columnCount: 0,
    headers: [],
    previewRows: [],
    warnings: [{ type: 'empty_sheet', message: msg }],
    classification: 'Unknown',
    classificationConfidence: 0,
  }
}
