import * as fs from 'node:fs'
import * as path from 'node:path'
import * as XLSX from 'xlsx'
import { parse } from 'csv-parse'
import { IMPORT_CONFIG } from '../import-config'
import type { ParsedSheetInfo, SheetWarning } from '../types'

export interface ChunkCallbacks {
  resumeRows?: number
  onChunk: (sheetIndex: number, chunkIndex: number, rowStart: number, rows: Record<string, unknown>[]) => Promise<void>
  onProgress: (checkpoint: Record<string, unknown>) => Promise<void>
  isCancelled: () => boolean
}

export async function parseCsvChunked(filePath: string, sheetName: string, callbacks: ChunkCallbacks): Promise<ParsedSheetInfo> {
  const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, bom: true, relax_column_count: true, skip_empty_lines: true, trim: true }))
  const previewRows: Record<string, unknown>[] = [], warnings: SheetWarning[] = [], chunk: Record<string, unknown>[] = []
  let headers: string[] = [], rowCount = 0, chunkIndex = Math.floor((callbacks.resumeRows ?? 0) / IMPORT_CONFIG.chunkSizeRows)
  for await (const raw of parser) {
    if (callbacks.isCancelled()) throw new Error('Import was cancelled.')
    rowCount++
    if (!headers.length) headers = Object.keys(raw)
    if (rowCount <= (callbacks.resumeRows ?? 0)) continue
    const row = boundedRow(raw)
    if (previewRows.length < IMPORT_CONFIG.previewRows) previewRows.push(row)
    chunk.push(row)
    if (chunk.length >= IMPORT_CONFIG.chunkSizeRows) {
      const start = rowCount - chunk.length + 1
      await callbacks.onChunk(0, chunkIndex++, start, chunk.splice(0))
      await callbacks.onProgress({ phase: 'parsing', sheetIndex: 0, rowsProcessed: rowCount, chunkIndex })
    }
    if (rowCount >= IMPORT_CONFIG.maxRowsPerFile) { warnings.push({ type: 'truncated', message: `Row limit of ${IMPORT_CONFIG.maxRowsPerFile} reached; file truncated.` }); break }
  }
  if (chunk.length) await callbacks.onChunk(0, chunkIndex, rowCount - chunk.length + 1, chunk)
  return { name: sheetName, rowCount, columnCount: headers.length, headers, previewRows, warnings, classification: 'Unknown', classificationConfidence: 0, allRows: [] }
}

export async function parseExcelChunked(filePath: string, callbacks: ChunkCallbacks): Promise<ParsedSheetInfo[]> {
  const workbook = XLSX.readFile(filePath, { cellFormula: false, cellHTML: false, cellNF: false, cellText: true, raw: true, type: 'file', dense: true })
  const results: ParsedSheetInfo[] = []
  for (let sheetIndex = 0; sheetIndex < Math.min(workbook.SheetNames.length, IMPORT_CONFIG.maxSheetsPerWorkbook); sheetIndex++) {
    const name = workbook.SheetNames[sheetIndex], worksheet = workbook.Sheets[name], range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1:A1')
    const headers = (XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, range: range.s.r, blankrows: false })[0] ?? []).map(String)
    const previewRows: Record<string, unknown>[] = [], warnings: SheetWarning[] = []; let rowCount = 0, chunkIndex = 0
    for (let start = range.s.r + 1; start <= range.e.r; start += IMPORT_CONFIG.chunkSizeRows) {
      if (callbacks.isCancelled()) throw new Error('Import was cancelled.')
      const end = Math.min(range.e.r, start + IMPORT_CONFIG.chunkSizeRows - 1)
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: true, range: { s: { r: start, c: range.s.c }, e: { r: end, c: range.e.c } } }).map(boundedRow)
      if (!rows.length) continue
      previewRows.push(...rows.slice(0, Math.max(0, IMPORT_CONFIG.previewRows - previewRows.length)))
      await callbacks.onChunk(sheetIndex, chunkIndex++, rowCount + 1, rows); rowCount += rows.length
      await callbacks.onProgress({ phase: 'parsing', sheetIndex, rowsProcessed: rowCount, chunkIndex })
      if (rowCount >= IMPORT_CONFIG.maxRowsPerSheet) {
        if (end < range.e.r) warnings.push({ type: 'truncated', message: `Row limit of ${IMPORT_CONFIG.maxRowsPerSheet} reached on sheet "${name}"; conversion is blocked until the limit is raised or the source is split.` })
        break
      }
    }
    results.push({ name, rowCount, columnCount: headers.length, headers, previewRows, warnings, classification: 'Unknown', classificationConfidence: 0, allRows: [] })
  }
  return results
}

function boundedRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).slice(0, IMPORT_CONFIG.previewColumns).map(([key, value]) => [key, typeof value === 'string' && value.length > IMPORT_CONFIG.maxCellLength ? `${value.slice(0, IMPORT_CONFIG.maxCellLength)}...` : value]))
}
