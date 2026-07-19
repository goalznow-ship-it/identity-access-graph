import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ImportAuditLogEntity, ImportJobEntity, ImportRowChunkEntity, ImportSessionEntity, ImportValidationIssueEntity } from '../database/entities'
import type { ValidationResult } from './validation/validation.service'

@Injectable()
export class ImportReportingService {
  constructor(
    @InjectRepository(ImportSessionEntity) private readonly sessions: Repository<ImportSessionEntity>,
    @InjectRepository(ImportJobEntity) private readonly jobs: Repository<ImportJobEntity>,
    @InjectRepository(ImportAuditLogEntity) private readonly audit: Repository<ImportAuditLogEntity>,
    @InjectRepository(ImportRowChunkEntity) private readonly chunks: Repository<ImportRowChunkEntity>,
    @InjectRepository(ImportValidationIssueEntity) private readonly issues: Repository<ImportValidationIssueEntity>,
  ) {}

  async history(limit = 50, offset = 0) {
    const [rows, total] = await this.sessions.findAndCount({ order: { createdAt: 'DESC' }, take: Math.min(200, Math.max(1, limit)), skip: Math.max(0, offset) })
    return { total, limit, offset, imports: rows.map((row) => ({ ...(row.payload as any).session, importId: row.importId, status: row.status, cancelled: row.cancelled, createdAt: row.createdAt, expiresAt: row.expiresAt })) }
  }
  auditLog(importId: string) { return this.audit.find({ where: { importId }, order: { createdAt: 'ASC' } }) }
  jobsFor(importId: string) { return this.jobs.find({ where: { importId }, order: { createdAt: 'ASC' } }) }

  async saveValidation(result: ValidationResult) {
    await this.issues.delete({ importId: result.importId, fileId: result.fileId, sheetIndex: result.sheetIndex })
    if (result.issues.length) await this.issues.save(result.issues.map((issue) => ({ importId: result.importId, fileId: result.fileId, sheetIndex: result.sheetIndex, row: issue.row, severity: issue.severity, code: issue.code, payload: issue as unknown as Record<string, unknown> })))
  }
  async validationReport(importId: string) {
    const issues = await this.issues.find({ where: { importId }, order: { fileId: 'ASC', sheetIndex: 'ASC', row: 'ASC' } })
    const counts = { total: issues.length, info: 0, warning: 0, error: 0, critical: 0 }
    issues.forEach((issue) => { const key = issue.severity.toLowerCase() as 'info' | 'warning' | 'error' | 'critical'; if (key in counts) counts[key]++ })
    return { importId, summary: counts, issues: issues.map((issue) => issue.payload) }
  }
  async errorCsv(importId: string) {
    const report = await this.validationReport(importId)
    const header = ['severity', 'code', 'file', 'sheet', 'row', 'sourceColumn', 'targetField', 'rawValue', 'message', 'suggestedResolution']
    const lines = report.issues.filter((issue: any) => ['ERROR', 'CRITICAL'].includes(issue.severity)).map((issue: any) => header.map((field) => csv(issue[field] ?? '')).join(','))
    return [header.join(','), ...lines].join('\n')
  }
  async statistics(importId: string) {
    const session = await this.sessions.findOneBy({ importId })
    if (!session) return null
    const [jobs, chunks, report] = await Promise.all([this.jobsFor(importId), this.chunks.find({ where: { importId } }), this.validationReport(importId)])
    const payload = session.payload as any, files = payload.session?.files ?? []
    return { importId, status: session.status, files: files.length, successfulFiles: files.filter((file: any) => file.status === 'inspected').length, failedFiles: files.filter((file: any) => file.status === 'error').length, rows: chunks.reduce((sum, chunk) => sum + (chunk.rowEnd - chunk.rowStart + 1), 0), chunks: chunks.length, bytes: files.reduce((sum: number, file: any) => sum + Number(file.size ?? 0), 0), validation: report.summary, duplicates: report.issues.filter((issue: any) => String(issue.code).startsWith('DUP_')).length, jobs: Object.fromEntries(['QUEUED', 'PROCESSING', 'RETRY', 'COMPLETED', 'FAILED', 'CANCELLED'].map((status) => [status.toLowerCase(), jobs.filter((job) => job.status === status).length])) }
  }
}

function csv(value: unknown) { return `"${String(value).replace(/"/g, '""')}"` }
