import { Injectable, Logger } from '@nestjs/common'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { IMPORT_CONFIG } from './import-config'
import { parseCsv } from './parsers/csv-parser'
import { parseExcel } from './parsers/excel-parser'
import { parseJson } from './parsers/json-parser'
import { classify } from './classification/classifier'
import type { ImportFile, ImportSession, DatasetType, SessionProgress, ImportPhase, ImportLimits } from './types'
import type { ValidationResult } from './validation/validation.service'
import type { ColumnMapping } from './mapping/mapping.service'
import type { CorrelationResult } from './correlation'
import type { ConversionResult } from './graph-conversion'

const UPLOAD_DIR = IMPORT_CONFIG.uploadDir

function isAllowed(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return (IMPORT_CONFIG.allowedExtensions as readonly string[]).includes(ext)
}

function sanitizeName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255)
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name)
  private sessions = new Map<string, ImportSession>()
  private validationCache = new Map<string, ValidationResult[]>()
  private mappingCache = new Map<string, ColumnMapping[]>()
  private correlationCache = new Map<string, CorrelationResult>()
  private conversionCache = new Map<string, ConversionResult>()
  private sessionTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private cancelledSessions = new Set<string>()

  private sheetKey(importId: string, fileId: string, sheetIndex: number): string {
    return `${importId}:${fileId}:${sheetIndex}`
  }

  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
    this.logger.log(`Upload directory: ${UPLOAD_DIR}`)
    this.logger.log(`Max file size: ${IMPORT_CONFIG.maxFileSizeBytes / 1024 / 1024}MB`)
    this.logger.log(`Max rows per sheet: ${IMPORT_CONFIG.maxRowsPerSheet}`)
    this.logger.log(`Session TTL: ${IMPORT_CONFIG.sessionTtlMs / 60000}min`)
  }

  getLimits(): ImportLimits {
    return {
      maxFileSizeMb: Math.round(IMPORT_CONFIG.maxFileSizeBytes / 1024 / 1024),
      maxFilesPerSession: IMPORT_CONFIG.maxFilesPerSession,
      maxRowsPerFile: IMPORT_CONFIG.maxRowsPerFile,
      maxRowsPerSheet: IMPORT_CONFIG.maxRowsPerSheet,
      maxSheetsPerWorkbook: IMPORT_CONFIG.maxSheetsPerWorkbook,
      previewRows: IMPORT_CONFIG.previewRows,
      previewColumns: IMPORT_CONFIG.previewColumns,
      maxCellLength: IMPORT_CONFIG.maxCellLength,
      sessionTtlMinutes: Math.round(IMPORT_CONFIG.sessionTtlMs / 60000),
      maxConcurrentSessions: IMPORT_CONFIG.maxConcurrentSessions,
      maxConcurrentFiles: IMPORT_CONFIG.maxConcurrentFiles,
      chunkSizeRows: IMPORT_CONFIG.chunkSizeRows,
    }
  }

  async upload(files: Express.Multer.File[]): Promise<ImportSession> {
    if (this.sessions.size >= IMPORT_CONFIG.maxConcurrentSessions) {
      throw new Error(`Maximum concurrent sessions (${IMPORT_CONFIG.maxConcurrentSessions}) reached.`)
    }

    const importId = randomUUID()
    const importFiles: ImportFile[] = []
    const startTime = Date.now()
    const allowedCount = Math.min(files.length, IMPORT_CONFIG.maxFilesPerSession)

    for (let fi = 0; fi < allowedCount; fi++) {
      const file = files[fi]
      const ext = path.extname(file.originalname).toLowerCase()

      if (!isAllowed(file.originalname)) {
        importFiles.push(this.errorFile(file, `Unsupported file type: ${ext}. Allowed: ${(IMPORT_CONFIG.allowedExtensions as readonly string[]).join(', ')}`))
        continue
      }

      if (file.size > IMPORT_CONFIG.maxFileSizeBytes) {
        importFiles.push(this.errorFile(file, `File exceeds size limit of ${Math.round(IMPORT_CONFIG.maxFileSizeBytes / 1024 / 1024)}MB.`))
        continue
      }

      const fileId = randomUUID()
      const sanitized = sanitizeName(file.originalname)
      const destPath = path.join(UPLOAD_DIR, `${fileId}-${sanitized}`)

      try {
        fs.writeFileSync(destPath, file.buffer)

        let sheets: Awaited<ReturnType<typeof parseCsv>>[] = []

        if (ext === '.csv') {
          sheets = [await parseCsv(destPath, file.originalname.replace(ext, ''))]
        } else if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
          sheets = [parseJson(destPath, file.originalname.replace(ext, ''))]
        } else {
          sheets = parseExcel(destPath)
        }

        for (const sheet of sheets) {
          const classification = classify(sheet.headers)
          sheet.classification = classification.type
          sheet.classificationConfidence = classification.confidence
        }

        importFiles.push({
          id: fileId,
          originalName: file.originalname,
          sanitizedName: sanitized,
          mimeType: file.mimetype,
          size: file.size,
          status: 'inspected',
          sheets,
          filePath: destPath,
          progress: {
            phase: 'parsing',
            percent: 100,
            rowsProcessed: sheets.reduce((s, sh) => s + sh.rowCount, 0),
            totalRows: sheets.reduce((s, sh) => s + sh.rowCount, 0),
            throughput: 0,
            elapsedMs: Date.now() - startTime,
            estimatedRemainingMs: 0,
          },
        })
      } catch (err) {
        this.logger.error(`Failed to parse file ${file.originalname}: ${(err as Error).message}`)
        importFiles.push(this.errorFile(file, `Failed to parse: ${(err as Error).message}`))
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
      }
    }

    if (files.length > IMPORT_CONFIG.maxFilesPerSession) {
      this.logger.warn(`Upload received ${files.length} files, limited to ${IMPORT_CONFIG.maxFilesPerSession}`)
    }

    const now = Date.now()
    const session: ImportSession = {
      importId,
      files: importFiles,
      createdAt: now,
      progress: {
        status: 'completed',
        filesCompleted: importFiles.filter((f) => f.status === 'inspected').length,
        filesFailed: importFiles.filter((f) => f.status === 'error').length,
        totalRows: importFiles.reduce((s, f) => s + f.sheets.reduce((s2, sh) => s2 + sh.rowCount, 0), 0),
        rowsProcessed: importFiles.reduce((s, f) => s + f.sheets.reduce((s2, sh) => s2 + sh.rowCount, 0), 0),
        percent: 100,
        throughput: 0,
        elapsedMs: now - startTime,
        estimatedRemainingMs: 0,
        warnings: [],
        truncated: false,
      },
    }

    this.sessions.set(importId, session)
    this.scheduleCleanup(importId)

    return session
  }

  getSession(importId: string): ImportSession | undefined {
    return this.sessions.get(importId)
  }

  getProgress(importId: string): SessionProgress | null {
    const session = this.sessions.get(importId)
    if (!session) return null
    if (this.cancelledSessions.has(importId)) {
      return { ...session.progress!, status: 'cancelled' }
    }
    return session.progress ?? null
  }

  cancel(importId: string): boolean {
    const session = this.sessions.get(importId)
    if (!session) return false
    session.cancelled = true
    this.cancelledSessions.add(importId)
    this.updateProgress(importId, { status: 'cancelled' })
    this.cleanupSessionFiles(importId)
    return true
  }

  async retryFile(importId: string, fileId: string): Promise<ImportSession | null> {
    const session = this.sessions.get(importId)
    if (!session) return null

    const fileIndex = session.files.findIndex((f) => f.id === fileId)
    if (fileIndex === -1 || session.files[fileIndex].status !== 'error') return null

    const file = session.files[fileIndex]
    if (!file.filePath || !fs.existsSync(file.filePath)) return null

    try {
      const ext = path.extname(file.originalName).toLowerCase()
      let sheets: Awaited<ReturnType<typeof parseCsv>>[] = []

      if (ext === '.csv') {
        sheets = [await parseCsv(file.filePath, file.originalName.replace(ext, ''))]
      } else if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
        sheets = [parseJson(file.filePath, file.originalName.replace(ext, ''))]
      } else {
        sheets = parseExcel(file.filePath)
      }

      for (const sheet of sheets) {
        const classification = classify(sheet.headers)
        sheet.classification = classification.type
        sheet.classificationConfidence = classification.confidence
      }

      session.files[fileIndex] = {
        ...file,
        status: 'inspected',
        sheets,
        error: undefined,
      }

      this.clearMappings(importId, fileId, 0)
      this.invalidateAllDerived(importId)
      return session
    } catch (err) {
      this.logger.error(`Retry failed for file ${file.originalName}: ${(err as Error).message}`)
      session.files[fileIndex] = {
        ...file,
        error: `Retry failed: ${(err as Error).message}`,
      }
      return null
    }
  }

  removeFile(importId: string, fileId: string): ImportSession | null {
    const session = this.sessions.get(importId)
    if (!session) return null

    const fileIndex = session.files.findIndex((f) => f.id === fileId)
    if (fileIndex === -1) return null

    const file = session.files[fileIndex]
    if (file.filePath && fs.existsSync(file.filePath)) {
      try { fs.unlinkSync(file.filePath) } catch { /* ignore */ }
    }

    session.files.splice(fileIndex, 1)

    for (let si = 0; si < (file.sheets?.length ?? 0); si++) {
      this.mappingCache.delete(this.sheetKey(importId, fileId, si))
    }
    this.invalidateAllDerived(importId)

    return session
  }

  setMappings(importId: string, fileId: string, sheetIndex: number, mappings: ColumnMapping[]): void {
    this.mappingCache.set(this.sheetKey(importId, fileId, sheetIndex), mappings.map((m) => ({ ...m })))
    this.invalidateValidationResult(importId, fileId, sheetIndex)
    this.clearDerivedResults(importId)
  }

  getMappings(importId: string, fileId: string, sheetIndex: number): ColumnMapping[] | undefined {
    return this.mappingCache.get(this.sheetKey(importId, fileId, sheetIndex))?.map((m) => ({ ...m }))
  }

  clearMappings(importId: string, fileId: string, sheetIndex: number): void {
    this.mappingCache.delete(this.sheetKey(importId, fileId, sheetIndex))
    this.invalidateValidationResult(importId, fileId, sheetIndex)
    this.clearDerivedResults(importId)
  }

  classify(importId: string, fileId: string, sheetIndex: number, type: DatasetType): ImportSession | null {
    const session = this.sessions.get(importId)
    if (!session) return null

    const file = session.files.find((f) => f.id === fileId)
    if (!file || !file.sheets[sheetIndex]) return null

    file.sheets[sheetIndex].manualOverride = type as any
    file.sheets[sheetIndex].classification = type as any
    file.status = 'classified'
    this.clearMappings(importId, fileId, sheetIndex)

    return session
  }

  setValidationResults(importId: string, results: ValidationResult[]): void {
    this.validationCache.set(importId, results)
  }

  setValidationResult(importId: string, result: ValidationResult): void {
    const results = this.getValidationResults(importId).filter(
      (item) => item.fileId !== result.fileId || item.sheetIndex !== result.sheetIndex,
    )
    this.validationCache.set(importId, [...results, result])
  }

  invalidateValidationResult(importId: string, fileId: string, sheetIndex: number): void {
    const remaining = this.getValidationResults(importId).filter(
      (item) => item.fileId !== fileId || item.sheetIndex !== sheetIndex,
    )
    if (remaining.length > 0) this.validationCache.set(importId, remaining)
    else this.validationCache.delete(importId)
  }

  getValidationResults(importId: string): ValidationResult[] {
    return this.validationCache.get(importId) ?? []
  }

  setCorrelationResult(importId: string, result: CorrelationResult): void {
    this.correlationCache.set(importId, result)
    this.conversionCache.delete(importId)
  }

  getCorrelationResult(importId: string): CorrelationResult | undefined {
    return this.correlationCache.get(importId)
  }

  setConversionResult(importId: string, result: ConversionResult): void {
    this.conversionCache.set(importId, result)
  }

  getConversionResult(importId: string): ConversionResult | undefined {
    return this.conversionCache.get(importId)
  }

  clearDerivedResults(importId: string): void {
    this.correlationCache.delete(importId)
    this.conversionCache.delete(importId)
  }

  private invalidateAllDerived(importId: string): void {
    this.validationCache.delete(importId)
    this.clearDerivedResults(importId)
  }

  isCancelled(importId: string): boolean {
    return this.cancelledSessions.has(importId)
  }

  private updateProgress(importId: string, update: Partial<SessionProgress>): void {
    const session = this.sessions.get(importId)
    if (!session) return
    session.progress = { ...session.progress!, ...update }
  }

  private scheduleCleanup(importId: string): void {
    const timer = setTimeout(() => {
      this.cleanupSession(importId)
    }, IMPORT_CONFIG.sessionTtlMs)
    timer.unref()
    this.sessionTimers.set(importId, timer)
  }

  private errorFile(file: Express.Multer.File, error: string): ImportFile {
    return {
      id: randomUUID(),
      originalName: file.originalname,
      sanitizedName: sanitizeName(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      status: 'error',
      sheets: [],
      error,
    }
  }

  private cleanupSessionFiles(importId: string): void {
    const session = this.sessions.get(importId)
    if (!session) return
    for (const file of session.files) {
      if (file.filePath && fs.existsSync(file.filePath)) {
        try { fs.unlinkSync(file.filePath) } catch { /* ignore */ }
      }
    }
  }

  private cleanupSession(importId: string): void {
    const session = this.sessions.get(importId)
    if (session) {
      this.cleanupSessionFiles(importId)
      this.sessions.delete(importId)
      this.cancelledSessions.delete(importId)
      this.validationCache.delete(importId)
      this.clearDerivedResults(importId)
      for (const key of this.mappingCache.keys()) {
        if (key.startsWith(`${importId}:`)) this.mappingCache.delete(key)
      }
      const timer = this.sessionTimers.get(importId)
      if (timer) {
        clearTimeout(timer)
        this.sessionTimers.delete(importId)
      }
    }
  }

  cleanupExpiredSessions(): number {
    const now = Date.now()
    let count = 0
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt > IMPORT_CONFIG.sessionTtlMs) {
        this.cleanupSession(id)
        count++
      }
    }
    return count
  }
}
