import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { IMPORT_CONFIG } from './import-config'
import { ImportQueueService } from './import-queue.service'
import { ImportsService } from './imports.service'
import { ImportSourceError, safeImportSourceName, structuredImportError } from './import-source-file'

@Injectable()
export class ImportWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ImportWorkerService.name)
  private readonly workerId = `import-${process.pid}-${randomUUID()}`
  private timer?: ReturnType<typeof setInterval>
  private active = 0
  private startedAt = new Date()
  private lastHeartbeat?: Date
  private lastError?: string

  constructor(private readonly queue: ImportQueueService, private readonly imports: ImportsService) {}
  onApplicationBootstrap() {
    const safeTick = () => void this.tick().catch((error: Error) => { this.lastError = error.message; this.logger.error(`Worker tick failed safely: ${error.message}`) })
    this.timer = setInterval(safeTick, IMPORT_CONFIG.workerPollMs); this.timer.unref(); safeTick()
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer) }

  async tick() {
    this.lastHeartbeat = new Date()
    while (this.active < IMPORT_CONFIG.workerConcurrency) {
      const job = await this.queue.claim(this.workerId).catch((error) => { this.lastError = (error as Error).message; return null })
      if (!job) break
      this.active++
      void this.runJob(job).finally(() => { this.active--; void this.tick().catch((error: Error) => this.logger.error(`Worker continuation failed safely: ${error.message}`)) })
    }
  }

  private async runJob(job: any): Promise<void> {
    try {
      await this.imports.processQueuedJob(job, (checkpoint) => this.queue.checkpoint(job.id, checkpoint))
      await this.queue.complete(job)
    } catch (error) {
      const detail = structuredImportError(error)
      this.lastError = detail.message
      const session = this.imports.getSession(job.importId)
      const file = session?.files.find((item) => item.id === job.fileId)
      this.logger.error(`Import job failed import=${job.importId} job=${job.id} file=${safeImportSourceName(file?.filePath ?? file?.sanitizedName ?? job.fileId)} code=${detail.code}: ${detail.message}`)
      try {
        if (error instanceof ImportSourceError) await this.queue.failPermanent(job, error)
        else await this.queue.fail(job, error instanceof Error ? error : new Error(detail.message))
        this.imports.markFileFailed(job.importId, job.fileId, detail.message, detail.code)
      } catch (persistError) {
        this.logger.error(`Could not persist import failure import=${job.importId} job=${job.id}: ${(persistError as Error).message}`)
      }
    }
  }

  async health() {
    const queue = await this.queue.stats()
    return { status: this.lastHeartbeat && Date.now() - this.lastHeartbeat.getTime() < IMPORT_CONFIG.workerPollMs * 3 + 1000 ? 'ok' : 'starting', workerId: this.workerId, active: this.active, concurrency: IMPORT_CONFIG.workerConcurrency, startedAt: this.startedAt.toISOString(), lastHeartbeat: this.lastHeartbeat?.toISOString() ?? null, lastError: this.lastError ?? null, queue }
  }
}
