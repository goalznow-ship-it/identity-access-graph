import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { ImportsService } from '../imports.service'
import { parseCsvChunked } from '../parsers/chunked-parser'
import { IMPORT_CONFIG } from '../import-config'

const tmpDir = path.resolve(process.cwd(), '.imports-tmp-worker-flow')

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
