import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { DataSource, LessThanOrEqual, Repository } from 'typeorm'
import { ImportAuditLogEntity, ImportJobEntity } from '../database/entities'
import { IMPORT_CONFIG } from './import-config'
import { structuredImportError } from './import-source-file'

@Injectable()
export class ImportQueueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ImportJobEntity) private readonly jobs: Repository<ImportJobEntity>,
    @InjectRepository(ImportAuditLogEntity) private readonly audit: Repository<ImportAuditLogEntity>,
  ) {}

  async enqueue(importId: string, fileId: string) {
    const job = await this.jobs.save({ id: randomUUID(), importId, fileId, status: 'QUEUED', attempts: 0, maxAttempts: IMPORT_CONFIG.maxJobAttempts, checkpoint: {}, error: null, lockedBy: null, lockedAt: null, nextAttemptAt: new Date(), completedAt: null })
    await this.record(importId, 'JOB_QUEUED', { jobId: job.id, fileId })
    return job
  }

  async claim(workerId: string): Promise<ImportJobEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ImportJobEntity)
      const expired = new Date(Date.now() - Math.max(IMPORT_CONFIG.workerLeaseMs, IMPORT_CONFIG.staleJobTimeoutMs))
      const job = await repository.createQueryBuilder('job')
        .setLock('pessimistic_write').setOnLocked('skip_locked')
        .where('(job.status IN (:...available) AND job.next_attempt_at <= now()) OR (job.status = :processing AND job.locked_at < :expired)', { available: ['QUEUED', 'RETRY'], processing: 'PROCESSING', expired })
        .orderBy('job.created_at', 'ASC').getOne()
      if (!job) return null
      job.status = 'PROCESSING'; job.lockedBy = workerId; job.lockedAt = new Date(); job.attempts += 1; job.error = null
      return repository.save(job)
    })
  }

  async checkpoint(jobId: string, checkpoint: Record<string, unknown>) {
    await this.jobs.update(jobId, { checkpoint, lockedAt: new Date() } as any)
  }

  async complete(job: ImportJobEntity) {
    await this.jobs.update(job.id, { status: 'COMPLETED', completedAt: new Date(), lockedAt: null, lockedBy: null, error: null })
    await this.record(job.importId, 'JOB_COMPLETED', { jobId: job.id, fileId: job.fileId, attempts: job.attempts })
  }

  async fail(job: ImportJobEntity, error: Error) {
    const current = await this.jobs.findOneBy({ id: job.id })
    if (current?.status === 'CANCELLED') return
    const retry = job.attempts < job.maxAttempts
    const delay = IMPORT_CONFIG.retryBaseDelayMs * 2 ** Math.max(0, job.attempts - 1)
    await this.jobs.update(job.id, { status: retry ? 'RETRY' : 'FAILED', error: error.message, lockedAt: null, lockedBy: null, nextAttemptAt: new Date(Date.now() + delay), completedAt: retry ? null : new Date() })
    await this.record(job.importId, retry ? 'JOB_RETRY_SCHEDULED' : 'JOB_FAILED', { jobId: job.id, fileId: job.fileId, attempts: job.attempts, error: error.message, delayMs: retry ? delay : 0 })
  }

  async failPermanent(job: ImportJobEntity, error: unknown, event = 'JOB_FAILED') {
    const detail = structuredImportError(error)
    await this.jobs.update(job.id, { status: 'FAILED', error: JSON.stringify(detail), lockedAt: null, lockedBy: null, completedAt: new Date() })
    await this.record(job.importId, event, { jobId: job.id, fileId: job.fileId, ...detail })
  }

  async requeueRecovered(job: ImportJobEntity) {
    if (!['QUEUED', 'RETRY', 'PROCESSING'].includes(job.status)) return
    await this.jobs.update(job.id, { status: 'QUEUED', lockedAt: null, lockedBy: null, nextAttemptAt: new Date(), completedAt: null })
    await this.record(job.importId, 'JOB_RECOVERED', { jobId: job.id, fileId: job.fileId })
  }

  async cancel(importId: string) {
    await this.jobs.createQueryBuilder().update().set({ status: 'CANCELLED', completedAt: new Date(), lockedAt: null, lockedBy: null }).where('import_id = :importId AND status IN (:...statuses)', { importId, statuses: ['QUEUED', 'RETRY', 'PROCESSING'] }).execute()
    await this.record(importId, 'IMPORT_CANCELLED', {})
  }

  async retry(importId: string, fileId: string) {
    const job = await this.jobs.findOne({ where: { importId, fileId }, order: { createdAt: 'DESC' } })
    if (!job) return this.enqueue(importId, fileId)
    job.status = 'QUEUED'; job.attempts = 0; job.error = null; job.nextAttemptAt = new Date(); job.completedAt = null
    await this.jobs.save(job); await this.record(importId, 'JOB_MANUALLY_RETRIED', { jobId: job.id, fileId }); return job
  }

  async jobsFor(importId: string) { return this.jobs.find({ where: { importId }, order: { createdAt: 'ASC' } }) }
  async stats() {
    const statuses = ['QUEUED', 'PROCESSING', 'RETRY', 'COMPLETED', 'FAILED', 'CANCELLED']
    const counts = Object.fromEntries(await Promise.all(statuses.map(async (status) => [status.toLowerCase(), await this.jobs.countBy({ status })])))
    const oldest = await this.jobs.findOne({ where: { status: 'QUEUED', nextAttemptAt: LessThanOrEqual(new Date()) }, order: { createdAt: 'ASC' } })
    return { counts, oldestQueuedAt: oldest?.createdAt?.toISOString() ?? null }
  }
  record(importId: string, event: string, details: Record<string, unknown>, actor = 'system') { return this.audit.save({ importId, event, details, actor }) }
  auditFor(importId: string) { return this.audit.find({ where: { importId }, order: { createdAt: 'ASC' } }) }
}
