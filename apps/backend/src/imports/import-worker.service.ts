import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { IMPORT_CONFIG } from './import-config'
import { ImportQueueService } from './import-queue.service'
import { ImportsService } from './imports.service'

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
  onApplicationBootstrap() { this.timer = setInterval(() => void this.tick(), IMPORT_CONFIG.workerPollMs); this.timer.unref(); void this.tick() }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer) }

  async tick() {
    this.lastHeartbeat = new Date()
    while (this.active < IMPORT_CONFIG.workerConcurrency) {
      const job = await this.queue.claim(this.workerId).catch((error) => { this.lastError = (error as Error).message; return null })
      if (!job) break
      this.active++
      void this.imports.processQueuedJob(job, (checkpoint) => this.queue.checkpoint(job.id, checkpoint))
        .then(() => this.queue.complete(job))
        .catch(async (error: Error) => { this.lastError = error.message; this.logger.error(`Import job ${job.id} failed: ${error.message}`); await this.queue.fail(job, error); this.imports.markFileFailed(job.importId, job.fileId, error.message) })
        .finally(() => { this.active--; void this.tick() })
    }
  }

  async health() {
    const queue = await this.queue.stats()
    return { status: this.lastHeartbeat && Date.now() - this.lastHeartbeat.getTime() < IMPORT_CONFIG.workerPollMs * 3 + 1000 ? 'ok' : 'starting', workerId: this.workerId, active: this.active, concurrency: IMPORT_CONFIG.workerConcurrency, startedAt: this.startedAt.toISOString(), lastHeartbeat: this.lastHeartbeat?.toISOString() ?? null, lastError: this.lastError ?? null, queue }
  }
}
