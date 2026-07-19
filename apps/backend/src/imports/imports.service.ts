import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { IMPORT_CONFIG } from './import-config'
import { parseCsv } from './parsers/csv-parser'
import { parseExcel } from './parsers/excel-parser'
import { parseJson } from './parsers/json-parser'
import { classify } from './classification/classifier'
import type { ImportFile, ImportSession, DatasetType, SessionProgress, ImportPhase, ImportLimits, ParsedSheetInfo, SheetInfo } from './types'
import type { ValidationResult } from './validation/validation.service'
import type { ColumnMapping } from './mapping/mapping.service'
import type { CorrelationResult } from './correlation'
import type { ConversionResult } from './graph-conversion'
import { OperationalStoreService } from '../database/operational-store.service'

const UPLOAD_DIR = IMPORT_CONFIG.uploadDir
const STATE_DIR = path.join(UPLOAD_DIR, '.state')

function isAllowed(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return (IMPORT_CONFIG.allowedExtensions as readonly string[]).includes(ext)
}

function sanitizeName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255)
}

@Injectable()
export class ImportsService implements OnModuleInit {
  private readonly logger = new Logger(ImportsService.name)
  private sessions = new Map<string, ImportSession>()
  private validationCache = new Map<string, ValidationResult[]>()
  private mappingCache = new Map<string, ColumnMapping[]>()
  private correlationCache = new Map<string, CorrelationResult>()
  private conversionCache = new Map<string, ConversionResult>()
  private sessionTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private cancelledSessions = new Set<string>()
  private fullRowsCache = new Map<string, Record<string, unknown>[]>()

  private sheetKey(importId: string, fileId: string, sheetIndex: number): string {
    return `${importId}:${fileId}:${sheetIndex}`
  }

  constructor(@Optional() private readonly store?: OperationalStoreService) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true })
    if (!this.store && process.env.NODE_ENV !== 'test') this.restoreSnapshots()
    this.logger.log(`Upload directory: ${UPLOAD_DIR}`)
    this.logger.log(`Max file size: ${IMPORT_CONFIG.maxFileSizeBytes / 1024 / 1024}MB`)
    this.logger.log(`Max rows per sheet: ${IMPORT_CONFIG.maxRowsPerSheet}`)
    this.logger.log(`Session TTL: ${IMPORT_CONFIG.sessionTtlMs / 60000}min`)
  }

  async onModuleInit(): Promise<void> {
    if (!this.store) return
    for (const row of await this.store.loadImports()) {
      this.restorePayload(row.payload)
    }
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

        let parsedSheets: ParsedSheetInfo[] = []

        if (ext === '.csv') {
          parsedSheets = [await parseCsv(destPath, file.originalname.replace(ext, ''))]
        } else if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
          parsedSheets = [parseJson(destPath, file.originalname.replace(ext, ''))]
        } else {
          parsedSheets = parseExcel(destPath)
        }

        for (const sheet of parsedSheets) {
          const classification = classify(sheet.headers)
          sheet.classification = classification.type
          sheet.classificationConfidence = classification.confidence
        }

        const sheets: SheetInfo[] = parsedSheets.map(({ allRows: _allRows, ...sheet }, sheetIndex) => {
          this.fullRowsCache.set(this.sheetKey(importId, fileId, sheetIndex), parsedSheets[sheetIndex].allRows)
          return sheet
        })

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
        importFiles.push(this.errorFile(file, `Failed to parse: ${(err as Error).message}`, fileId, destPath))
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
    this.persistSnapshot(importId)
    this.scheduleCleanup(importId)

    return session
  }

  getSession(importId: string): ImportSession | undefined {
    return this.sessions.get(importId)
  }

  getLatestSession(): ImportSession | undefined {
    return [...this.sessions.values()]
      .filter((session) => !session.cancelled && !this.cancelledSessions.has(session.importId))
      .sort((a, b) => b.createdAt - a.createdAt)[0]
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
      let parsedSheets: ParsedSheetInfo[] = []

      if (ext === '.csv') {
        parsedSheets = [await parseCsv(file.filePath, file.originalName.replace(ext, ''))]
      } else if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
        parsedSheets = [parseJson(file.filePath, file.originalName.replace(ext, ''))]
      } else {
        parsedSheets = parseExcel(file.filePath)
      }

      for (const sheet of parsedSheets) {
        const classification = classify(sheet.headers)
        sheet.classification = classification.type
        sheet.classificationConfidence = classification.confidence
      }

      const sheets: SheetInfo[] = parsedSheets.map(({ allRows: _allRows, ...sheet }, sheetIndex) => {
        this.fullRowsCache.set(this.sheetKey(importId, fileId, sheetIndex), parsedSheets[sheetIndex].allRows)
        return sheet
      })

      session.files[fileIndex] = {
        ...file,
        status: 'inspected',
        sheets,
        error: undefined,
      }

      this.clearMappings(importId, fileId, 0)
      this.invalidateAllDerived(importId)
      this.persistSnapshot(importId)
      return session
    } catch (err) {
      this.logger.error(`Retry failed for file ${file.originalName}: ${(err as Error).message}`)
      session.files[fileIndex] = {
        ...file,
        error: `Retry failed: ${(err as Error).message}`,
      }
      this.persistSnapshot(importId)
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
      this.fullRowsCache.delete(this.sheetKey(importId, fileId, si))
    }
    this.invalidateAllDerived(importId)
    this.persistSnapshot(importId)

    return session
  }

  setMappings(importId: string, fileId: string, sheetIndex: number, mappings: ColumnMapping[]): void {
    this.mappingCache.set(this.sheetKey(importId, fileId, sheetIndex), mappings.map((m) => ({ ...m })))
    this.invalidateValidationResult(importId, fileId, sheetIndex)
    this.clearDerivedResults(importId)
    this.persistSnapshot(importId)
  }

  getMappings(importId: string, fileId: string, sheetIndex: number): ColumnMapping[] | undefined {
    return this.mappingCache.get(this.sheetKey(importId, fileId, sheetIndex))?.map((m) => ({ ...m }))
  }

  async getSheetRows(importId: string, fileId: string, sheetIndex: number): Promise<Record<string, unknown>[]> {
    const key = this.sheetKey(importId, fileId, sheetIndex)
    const cached = this.fullRowsCache.get(key)
    if (cached) return cached
    const session = this.sessions.get(importId)
    const file = session?.files.find((item) => item.id === fileId)
    if (!file?.filePath || !fs.existsSync(file.filePath)) return file?.sheets[sheetIndex]?.previewRows ?? []
    const ext = path.extname(file.originalName).toLowerCase()
    const parsed = ext === '.csv'
      ? [await parseCsv(file.filePath, file.originalName.replace(ext, ''))]
      : ext === '.json' || ext === '.jsonl' || ext === '.ndjson'
        ? [parseJson(file.filePath, file.originalName.replace(ext, ''))]
        : parseExcel(file.filePath)
    parsed.forEach((sheet, index) => this.fullRowsCache.set(this.sheetKey(importId, fileId, index), sheet.allRows))
    return this.fullRowsCache.get(key) ?? []
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
    this.persistSnapshot(importId)

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
    this.persistSnapshot(importId)
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
    this.persistSnapshot(importId)
  }

  getCorrelationResult(importId: string): CorrelationResult | undefined {
    return this.correlationCache.get(importId)
  }

  setConversionResult(importId: string, result: ConversionResult): void {
    this.conversionCache.set(importId, result)
    this.persistSnapshot(importId)
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
    this.persistSnapshot(importId)
  }

  private snapshotPath(importId: string): string {
    return path.join(STATE_DIR, `${importId}.json`)
  }

  private persistSnapshot(importId: string): void {
    const session = this.sessions.get(importId)
    if (!session) return
    const mappings = [...this.mappingCache.entries()].filter(([key]) => key.startsWith(`${importId}:`))
    const payload = {
      version: 1,
      session,
      validation: this.validationCache.get(importId) ?? [],
      mappings,
      correlation: this.correlationCache.get(importId) ?? null,
      conversion: this.conversionCache.get(importId) ?? null,
      fullRows: [...this.fullRowsCache.entries()].filter(([key]) => key.startsWith(`${importId}:`)),
      cancelled: this.cancelledSessions.has(importId),
    }
    if (this.store) {
      this.store.saveImport({ importId, status: session.progress?.status ?? 'completed', cancelled: payload.cancelled, payload, createdAt: new Date(session.createdAt), expiresAt: new Date(session.createdAt + IMPORT_CONFIG.sessionTtlMs) })
      return
    }
    const target = this.snapshotPath(importId)
    const temp = `${target}.tmp`
    try {
      fs.writeFileSync(temp, JSON.stringify(payload))
      fs.renameSync(temp, target)
    } catch (error) {
      this.logger.warn(`Could not persist import snapshot ${importId}: ${(error as Error).message}`)
      if (fs.existsSync(temp)) fs.unlinkSync(temp)
    }
  }

  private restoreSnapshots(): void {
    for (const name of fs.readdirSync(STATE_DIR).filter((item) => item.endsWith('.json'))) {
      try {
        const payload = JSON.parse(fs.readFileSync(path.join(STATE_DIR, name), 'utf8'))
        const session = payload.session as ImportSession
        if (!session?.importId) continue
        if (Date.now() - session.createdAt > IMPORT_CONFIG.sessionTtlMs) {
          for (const file of session.files ?? []) {
            if (file.filePath && fs.existsSync(file.filePath)) {
              try { fs.unlinkSync(file.filePath) } catch { /* ignore stale file cleanup races */ }
            }
          }
          fs.unlinkSync(path.join(STATE_DIR, name))
          continue
        }
        this.restorePayload(payload)
      } catch (error) {
        this.logger.warn(`Ignoring invalid import snapshot ${name}: ${(error as Error).message}`)
      }
    }
  }

  private restorePayload(payload: any): void {
    const session = payload.session as ImportSession
    if (!session?.importId || Date.now() - session.createdAt > IMPORT_CONFIG.sessionTtlMs) return
    this.sessions.set(session.importId, session)
    if (Array.isArray(payload.validation)) this.validationCache.set(session.importId, payload.validation)
    if (Array.isArray(payload.mappings)) for (const [key, value] of payload.mappings) this.mappingCache.set(key, value)
    if (payload.correlation) this.correlationCache.set(session.importId, payload.correlation)
    if (payload.conversion) this.conversionCache.set(session.importId, payload.conversion)
    if (Array.isArray(payload.fullRows)) for (const [key, value] of payload.fullRows) this.fullRowsCache.set(key, value)
    if (payload.cancelled) this.cancelledSessions.add(session.importId)
    this.scheduleCleanup(session.importId, Math.max(0, IMPORT_CONFIG.sessionTtlMs - (Date.now() - session.createdAt)))
  }

  private scheduleCleanup(importId: string, delayMs = IMPORT_CONFIG.sessionTtlMs): void {
    const timer = setTimeout(() => {
      this.cleanupSession(importId)
    }, delayMs)
    timer.unref()
    this.sessionTimers.set(importId, timer)
  }

  private errorFile(file: Express.Multer.File, error: string, id = randomUUID(), filePath?: string): ImportFile {
    return {
      id,
      originalName: file.originalname,
      sanitizedName: sanitizeName(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      status: 'error',
      sheets: [],
      error,
      filePath,
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
      this.store?.deleteImport(importId)
      this.cancelledSessions.delete(importId)
      this.validationCache.delete(importId)
      this.clearDerivedResults(importId)
      for (const key of this.mappingCache.keys()) {
        if (key.startsWith(`${importId}:`)) this.mappingCache.delete(key)
      }
      for (const key of this.fullRowsCache.keys()) {
        if (key.startsWith(`${importId}:`)) this.fullRowsCache.delete(key)
      }
      const timer = this.sessionTimers.get(importId)
      if (timer) {
        clearTimeout(timer)
        this.sessionTimers.delete(importId)
      }
      const snapshot = this.snapshotPath(importId)
      if (fs.existsSync(snapshot)) {
        try { fs.unlinkSync(snapshot) } catch { /* ignore cleanup races */ }
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
