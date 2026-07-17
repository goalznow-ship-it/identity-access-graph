import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'
import { IMPORT_CONFIG } from '../import-config'
import type { SheetInfo, SheetWarning } from '../types'

export async function parseCsv(filePath: string, sheetName: string): Promise<SheetInfo> {
  const stat = fs.statSync(filePath)
  if (stat.size === 0) {
    return emptyResult(sheetName, 'CSV file is empty.')
  }

  return new Promise((resolve, reject) => {
    let headers: string[] = []
    const allRows: Record<string, unknown>[] = []
    const previewRows: Record<string, unknown>[] = []
    const warnings: SheetWarning[] = []
    let lineCount = 0
    let dataRowCount = 0
    let truncated = false
    const seen = new Set<string>()
    let dupCount = 0
    const colValues: Map<number, Set<string>> = new Map()

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    })

    rl.on('line', (line) => {
      if (truncated) return
      lineCount++

      const trimmed = line.trim()
      if (trimmed.length === 0) return

      const values = parseCsvLine(line)

      if (!headers.length) {
        headers = values
        headers.forEach((_, i) => colValues.set(i, new Set()))
        return
      }

      dataRowCount++

      if (dataRowCount > IMPORT_CONFIG.maxRowsPerSheet) {
        truncated = true
        warnings.push({
          type: 'truncated',
          message: `Row limit of ${IMPORT_CONFIG.maxRowsPerSheet} reached; file truncated.`,
        })
        return
      }

      const row: Record<string, unknown> = {}
      let rowAllEmpty = true
      headers.forEach((h, i) => {
        const val = values[i] ?? null
        const cellVal = val !== null ? truncateCell(String(val)) : val
        row[h] = cellVal
        if (cellVal !== null && String(cellVal).trim() !== '') {
          rowAllEmpty = false
          colValues.get(i)?.add(String(cellVal))
        }
      })
      if (rowAllEmpty) return

      const key = headers.map((h) => String(row[h] ?? '')).join('|')
      if (seen.has(key)) dupCount++
      else seen.add(key)

      allRows.push(row)
      if (previewRows.length < IMPORT_CONFIG.previewRows) {
        previewRows.push(row)
      }
    })

    rl.on('close', () => {
      if (!headers.length) {
        resolve(emptyResult(sheetName, 'CSV file has no headers.'))
        return
      }

      const emptyCols = headers.filter((_, i) => !colValues.get(i)?.size)
      for (const col of emptyCols) {
        warnings.push({ type: 'empty_columns', message: `Column "${col}" is empty across all rows.`, column: col })
      }
      if (dupCount > 0) {
        warnings.push({ type: 'duplicate_rows', message: `Found ${dupCount} duplicate row(s).`, count: dupCount })
      }

      resolve({
        name: sheetName,
        rowCount: dataRowCount,
        columnCount: headers.length,
        headers,
        previewRows,
        warnings,
        classification: 'Unknown',
        classificationConfidence: 0,
      })
    })

    rl.on('error', (err) => reject(err))
  })
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

function truncateCell(val: string): string {
  return val.length > IMPORT_CONFIG.maxCellLength
    ? val.substring(0, IMPORT_CONFIG.maxCellLength) + '...'
    : val
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
