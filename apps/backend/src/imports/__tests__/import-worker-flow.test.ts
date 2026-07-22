import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { ImportsService } from '../imports.service'
import { parseCsvChunked } from '../parsers/chunked-parser'
import { IMPORT_CONFIG } from '../import-config'
import { ImportWorkerService } from '../import-worker.service'
import { ImportSourceError, SOURCE_FILE_MISSING, SOURCE_FILE_UNAVAILABLE_MESSAGE } from '../import-source-file'

const tmpDir = path.join(IMPORT_CONFIG.uploadDir, '.worker-flow-test')

before(() => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  process.env.IMPORT_UPLOAD_DIR = tmpDir
})

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  delete process.env.IMPORT_UPLOAD_DIR
})

describe('createReadStream — default-import fix regression', () => {
  it('fs.createReadStream is a function (not undefined)', () => {
    assert.equal(typeof fs.createReadStream, 'function')
  })

  it('handles a UTF-8 BOM and quoted CSV fields', async () => {
    const filePath = path.join(tmpDir, 'bom-quotes.csv')
    fs.writeFileSync(filePath, '\uFEFF"id","name"\n"1","Doe, Jane"\n')
    const result = await parseCsvChunked(filePath, 'test', { onChunk: async () => {}, onProgress: async () => {}, isCancelled: () => false })
    assert.equal(result.rowCount, 1)
    assert.equal(result.previewRows[0].name, 'Doe, Jane')
  })

  it('parseCsvChunked opens files with createReadStream successfully', async () => {
    const csv = 'id,name,email\n1,User1,user1@test.com\n2,User2,user2@test.com'
    const filePath = path.join(tmpDir, 'stream-fix.csv')
    fs.writeFileSync(filePath, csv)
    const result = await parseCsvChunked(filePath, 'test', {
      onChunk: async () => {},
      onProgress: async () => {},
      isCancelled: () => false,
    })
    assert.equal(result.rowCount, 2)
    assert.equal(result.columnCount, 3)
  })

  it('fs.createReadStream on missing file emits ENOENT (stream behavior)', () => {
    return new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream('/nonexistent-path.csv')
      stream.on('error', (err: NodeJS.ErrnoException) => {
        assert.equal(err.code, 'ENOENT')
        resolve()
      })
      stream.on('open', () => { reject(new Error('should not open')); stream.destroy() })
    })
  })
})

describe('ImportsService — session failure and lifecycle', () => {
  it('markFileFailed sets file to error and session status to failed', () => {
    const service = new ImportsService()
    const importId = 'test-fail-1'
    const fileId = 'file-fail-1'
    ;(service as any).sessions.set(importId, {
      importId,
      files: [{ id: fileId, originalName: 'test.csv', sanitizedName: 'test.csv', mimeType: 'text/csv', size: 10, status: 'uploaded', sheets: [], filePath: '/tmp/test.csv', progress: { phase: 'uploading', percent: 100, rowsProcessed: 0, totalRows: 0, throughput: 0, elapsedMs: 0, estimatedRemainingMs: 0 } }],
      createdAt: Date.now(),
      progress: { status: 'parsing', filesCompleted: 0, filesFailed: 0, totalRows: 0, rowsProcessed: 0, percent: 0, throughput: 0, elapsedMs: 0, estimatedRemainingMs: 0, warnings: [], truncated: false },
    } as any)
    service.markFileFailed(importId, fileId, 'test error')
    const updated = (service as any).sessions.get(importId)
    assert.equal(updated.files[0].status, 'error')
    assert.equal(updated.files[0].error, 'test error')
    assert.equal(updated.progress.status, 'failed')
  })

  it('processQueuedJob with file in "uploaded" state reparses via fallback', async () => {
    const service = new ImportsService()
    const csv = 'id,name\n1,Alice\n2,Bob'
    const filePath = path.join(tmpDir, 'pqj-fb.csv')
    fs.writeFileSync(filePath, csv)
    const { randomUUID } = await import('node:crypto')
    const importId = randomUUID()
    const fileId = randomUUID()
    ;(service as any).sessions.set(importId, {
      importId,
      files: [{ id: fileId, originalName: 'pqj-fb.csv', sanitizedName: 'pqj-fb.csv', mimeType: 'text/csv', size: Buffer.byteLength(csv), status: 'uploaded', sheets: [], filePath, progress: { phase: 'uploading', percent: 100, rowsProcessed: 0, totalRows: 0, throughput: 0, elapsedMs: 0, estimatedRemainingMs: 0 } }],
      createdAt: Date.now(),
      progress: { status: 'parsing', filesCompleted: 0, filesFailed: 0, totalRows: 0, rowsProcessed: 0, percent: 0, throughput: 0, elapsedMs: 0, estimatedRemainingMs: 0, warnings: [], truncated: false },
    } as any)
    const checkpoints: Record<string, unknown>[] = []
    const jobEntity = { id: 'job-fb', importId, fileId, status: 'QUEUED', attempts: 0, maxAttempts: 3, checkpoint: { rowsProcessed: 0 }, error: null, lockedBy: null, lockedAt: null, nextAttemptAt: new Date(), completedAt: null, createdAt: new Date() } as any
    await service.processQueuedJob(jobEntity, async (cp) => { checkpoints.push(cp) })
    const updated = (service as any).sessions.get(importId)
    assert.equal(updated.files[0].status, 'inspected')
    assert.equal(updated.files[0].sheets[0].rowCount, 2)
    assert.equal(updated.progress.status, 'completed')
    assert.ok(checkpoints.length >= 1)
  })

  it('processQueuedJob rejects for unknown session', async () => {
    const service = new ImportsService()
    const jobEntity = { id: 'bad-job', importId: 'nonexistent', fileId: 'nonexistent', status: 'QUEUED', attempts: 0, maxAttempts: 3, checkpoint: {}, error: null, lockedBy: null, lockedAt: null, nextAttemptAt: new Date(), completedAt: null, createdAt: new Date() } as any
    await assert.rejects(
      () => service.processQueuedJob(jobEntity, async () => {}),
      /Import session or file is no longer available/,
    )
  })

  it('missing source during queued processing rejects safely with a structured code', async () => {
    const service = new ImportsService()
    const importId = '00000000-0000-4000-8000-000000000001'
    const fileId = '00000000-0000-4000-8000-000000000002'
    ;(service as any).sessions.set(importId, {
      importId, createdAt: Date.now(), files: [{ id: fileId, originalName: 'gone.csv', sanitizedName: 'gone.csv', mimeType: 'text/csv', size: 1, status: 'uploaded', sheets: [], filePath: path.join(tmpDir, 'gone.csv') }],
      progress: { status: 'parsing', filesCompleted: 0, filesFailed: 0, totalRows: 0, rowsProcessed: 0, percent: 0, throughput: 0, elapsedMs: 0, estimatedRemainingMs: 0, warnings: [], truncated: false },
    } as any)
    const job = { id: 'job-missing', importId, fileId, status: 'QUEUED', checkpoint: {}, attempts: 1, maxAttempts: 3 } as any
    await assert.rejects(() => service.processQueuedJob(job, async () => {}), (error: any) => error.code === SOURCE_FILE_MISSING && error.message === SOURCE_FILE_UNAVAILABLE_MESSAGE)
  })

  it('startup recovery is idempotent for a missing file and excludes the failed session from active imports', async () => {
    const failed: string[] = []
    const queue = {
      jobsFor: async () => [{ id: 'job-recovery', importId: 'import-recovery', fileId: 'file-recovery', status: 'PROCESSING' }],
      failPermanent: async () => { failed.push('failed') },
      requeueRecovered: async () => { throw new Error('must not resume') },
    }
    const service = new ImportsService(undefined, queue as any)
    ;(service as any).sessions.set('import-recovery', { importId: 'import-recovery', createdAt: Date.now(), files: [{ id: 'file-recovery', originalName: 'gone.csv', sanitizedName: 'gone.csv', status: 'uploaded', sheets: [], filePath: path.join(tmpDir, 'missing.csv') }], progress: { status: 'parsing', filesCompleted: 0, filesFailed: 0 } })
    await (service as any).recoverStaleSessions()
    await (service as any).recoverStaleSessions()
    assert.equal(failed.length, 1)
    assert.equal(service.getProgress('import-recovery')?.status, 'failed')
    assert.notEqual(service.getLatestSession()?.importId, 'import-recovery')
  })

  it('startup recovery requeues an unfinished job when its source still exists', async () => {
    const filePath = path.join(tmpDir, 'resume.csv')
    fs.writeFileSync(filePath, 'id,name\n1,Alice\n')
    let resumed = 0
    const queue = { jobsFor: async () => [{ id: 'job-resume', importId: 'import-resume', fileId: 'file-resume', status: 'PROCESSING' }], failPermanent: async () => { throw new Error('must not fail') }, requeueRecovered: async () => { resumed++ } }
    const service = new ImportsService(undefined, queue as any)
    ;(service as any).sessions.set('import-resume', { importId: 'import-resume', createdAt: Date.now(), files: [{ id: 'file-resume', originalName: 'resume.csv', sanitizedName: 'resume.csv', status: 'uploaded', sheets: [], filePath }], progress: { status: 'parsing', filesCompleted: 0, filesFailed: 0 } })
    await (service as any).recoverStaleSessions()
    assert.equal(resumed, 1)
    assert.equal(service.getProgress('import-resume')?.status, 'parsing')
  })

  it('worker contains parser failure and persists a permanent missing-source failure', async () => {
    const calls: string[] = []
    const queue = { complete: async () => calls.push('complete'), fail: async () => calls.push('retry'), failPermanent: async () => calls.push('permanent'), checkpoint: async () => {}, stats: async () => ({ counts: {} }) }
    const imports = { processQueuedJob: async () => { throw new ImportSourceError(SOURCE_FILE_MISSING, SOURCE_FILE_UNAVAILABLE_MESSAGE) }, getSession: () => undefined, markFileFailed: () => calls.push('session-failed') }
    const worker = new ImportWorkerService(queue as any, imports as any)
    await (worker as any).runJob({ id: 'job', importId: 'import', fileId: 'file' })
    assert.deepEqual(calls, ['permanent', 'session-failed'])
    assert.equal((await worker.health()).status, 'starting')
  })

  it('cancel marks session as cancelled', () => {
    const service = new ImportsService()
    const importId = 'test-cancel-1'
    ;(service as any).sessions.set(importId, {
      importId,
      files: [],
      createdAt: Date.now(),
      progress: { status: 'parsing', filesCompleted: 0, filesFailed: 0, totalRows: 0, rowsProcessed: 0, percent: 0 },
    } as any)
    assert.equal(service.cancel(importId), true)
    assert.equal((service as any).sessions.get(importId).cancelled, true)
    assert.equal(service.getProgress(importId)!.status, 'cancelled')
  })

  it('retryFile re-parses a failed file inline', async () => {
    const service = new ImportsService()
    const csv = 'id,name\n1,Alice'
    const filePath = path.join(tmpDir, 'retry-inline.csv')
    fs.writeFileSync(filePath, csv)
    const { randomUUID } = await import('node:crypto')
    const importId = randomUUID()
    const fileId = randomUUID()
    ;(service as any).sessions.set(importId, {
      importId,
      files: [{ id: fileId, originalName: 'retry-inline.csv', sanitizedName: 'retry-inline.csv', mimeType: 'text/csv', size: Buffer.byteLength(csv), status: 'error', error: 'previous error', sheets: [], filePath, progress: { phase: 'uploading', percent: 100, rowsProcessed: 0, totalRows: 0, throughput: 0, elapsedMs: 0, estimatedRemainingMs: 0 } }],
      createdAt: Date.now(),
      progress: { status: 'failed', filesCompleted: 0, filesFailed: 1, totalRows: 0, rowsProcessed: 0, percent: 0 },
    } as any)
    const retried = await service.retryFile(importId, fileId, true)
    assert.ok(retried !== null)
    const updated = (service as any).sessions.get(importId)
    assert.equal(updated.files[0].status, 'inspected')
    assert.equal(updated.files[0].error, undefined)
  })
})

describe('Large CSV — remains streamed/chunked', () => {
  it('rows above chunk size processed in bounded chunks', async () => {
    const total = IMPORT_CONFIG.chunkSizeRows * 2 + 13
    const rows = Array.from({ length: total }, (_, i) => `${i + 1},User${i + 1},user${i + 1}@test.com`)
    const csv = `id,name,email\n${rows.join('\n')}`
    const filePath = path.join(tmpDir, 'large-chunked.csv')
    fs.writeFileSync(filePath, csv)
    const chunks: number[] = []
    const result = await parseCsvChunked(filePath, 'large', {
      onChunk: async (_s, _c, _start, rows) => { chunks.push(rows.length) },
      onProgress: async () => {},
      isCancelled: () => false,
    })
    assert.equal(result.rowCount, total)
    assert.ok(chunks.length >= 3, `expected >= 3 chunks, got ${chunks.length}`)
    assert.ok(chunks.every((c) => c <= IMPORT_CONFIG.chunkSizeRows))
  })
})
