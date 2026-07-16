import { Injectable, Logger } from '@nestjs/common'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { parseCsv } from './parsers/csv-parser'
import { parseExcel } from './parsers/excel-parser'
import { classify } from './classification/classifier'
import type { ImportFile, ImportSession, DatasetType } from './types'
import type { ValidationResult } from './validation/validation.service'
import type { ColumnMapping } from './mapping/mapping.service'

const UPLOAD_DIR = path.resolve(process.cwd(), '.imports-tmp')
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv'])

function isAllowed(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
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

  private sheetKey(importId: string, fileId: string, sheetIndex: number): string {
    return `${importId}:${fileId}:${sheetIndex}`
  }

  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
    this.logger.log(`Upload directory: ${UPLOAD_DIR}`)
  }

  async upload(files: Express.Multer.File[]): Promise<ImportSession> {
    const importId = randomUUID()
    const importFiles: ImportFile[] = []

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase()
      if (!isAllowed(file.originalname)) {
        importFiles.push({
          id: randomUUID(),
          originalName: file.originalname,
          sanitizedName: sanitizeName(file.originalname),
          mimeType: file.mimetype,
          size: file.size,
          status: 'error',
          sheets: [],
          error: `Unsupported file type: ${ext}. Allowed: .xlsx, .xls, .csv`,
        })
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        importFiles.push({
          id: randomUUID(),
          originalName: file.originalname,
          sanitizedName: sanitizeName(file.originalname),
          mimeType: file.mimetype,
          size: file.size,
          status: 'error',
          sheets: [],
          error: `File exceeds size limit of ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        })
        continue
      }

      const fileId = randomUUID()
      const sanitized = sanitizeName(file.originalname)
      const destPath = path.join(UPLOAD_DIR, `${fileId}-${sanitized}`)

      try {
        fs.writeFileSync(destPath, file.buffer)

        let sheets = ext === '.csv'
          ? [parseCsv(destPath, file.originalname.replace(ext, ''))]
          : parseExcel(destPath)

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
        })
      } catch (err) {
        this.logger.error(`Failed to parse file ${file.originalname}: ${(err as Error).message}`)
        importFiles.push({
          id: randomUUID(),
          originalName: file.originalname,
          sanitizedName: sanitizeName(file.originalname),
          mimeType: file.mimetype,
          size: file.size,
          status: 'error',
          sheets: [],
          error: `Failed to parse: ${(err as Error).message}`,
        })
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
      }
    }

    const session: ImportSession = { importId, files: importFiles }
    this.sessions.set(importId, session)

    setTimeout(() => {
      this.cleanupSession(importId)
    }, 30 * 60 * 1000)

    return session
  }

  getSession(importId: string): ImportSession | undefined {
    return this.sessions.get(importId)
  }

  setMappings(importId: string, fileId: string, sheetIndex: number, mappings: ColumnMapping[]): void {
    this.mappingCache.set(this.sheetKey(importId, fileId, sheetIndex), mappings.map((mapping) => ({ ...mapping })))
    this.invalidateValidationResult(importId, fileId, sheetIndex)
  }

  getMappings(importId: string, fileId: string, sheetIndex: number): ColumnMapping[] | undefined {
    return this.mappingCache.get(this.sheetKey(importId, fileId, sheetIndex))?.map((mapping) => ({ ...mapping }))
  }

  clearMappings(importId: string, fileId: string, sheetIndex: number): void {
    this.mappingCache.delete(this.sheetKey(importId, fileId, sheetIndex))
    this.invalidateValidationResult(importId, fileId, sheetIndex)
  }

  classify(importId: string, fileId: string, sheetIndex: number, type: string): ImportSession | null {
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

  private cleanupSession(importId: string): void {
    const session = this.sessions.get(importId)
    if (session) {
      for (const file of session.files) {
        if ((file as any).filePath && fs.existsSync((file as any).filePath)) {
          try {
            fs.unlinkSync((file as any).filePath)
          } catch { /* ignore */ }
        }
      }
      this.sessions.delete(importId)
      this.validationCache.delete(importId)
      for (const key of this.mappingCache.keys()) {
        if (key.startsWith(`${importId}:`)) this.mappingCache.delete(key)
      }
    }
  }
}
