import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { IMPORT_CONFIG } from '../import-config'
import { ImportsService } from '../imports.service'

const tmpDir = path.resolve(process.cwd(), '.imports-tmp-capacity-test')

before(() => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  process.env.IMPORT_MAX_FILE_SIZE_MB = '250'
  process.env.IMPORT_PREVIEW_ROWS = '100'
})

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('Import Config', () => {
  it('should parse 250 MB from env', () => {
    assert.equal(IMPORT_CONFIG.maxFileSizeBytes, 250 * 1024 * 1024)
  })

  it('should allow JSON extensions', () => {
    const exts = IMPORT_CONFIG.allowedExtensions as readonly string[]
    assert.ok(exts.includes('.json'))
    assert.ok(exts.includes('.jsonl'))
    assert.ok(exts.includes('.ndjson'))
    assert.ok(exts.includes('.csv'))
    assert.ok(exts.includes('.xlsx'))
  })

  it('should provide reasonable defaults', () => {
    assert.equal(IMPORT_CONFIG.maxFilesPerSession, 50)
    assert.equal(IMPORT_CONFIG.maxRowsPerSheet, 500_000)
    assert.equal(IMPORT_CONFIG.maxRowsPerFile, 10_000_000)
    assert.equal(IMPORT_CONFIG.chunkSizeRows, 5_000)
    assert.equal(IMPORT_CONFIG.previewRows, 100)
  })
})

describe('ImportsService - Limits', () => {
  it('should return import limits', () => {
    const service = new ImportsService()
    const limits = service.getLimits()
    assert.equal(limits.maxFileSizeMb, 250)
    assert.equal(limits.maxFilesPerSession, 50)
    assert.equal(limits.maxRowsPerSheet, 500_000)
    assert.equal(limits.previewRows, 100)
    assert.equal(limits.chunkSizeRows, 5_000)
  })

  it('should handle partial file failure', async () => {
    const service = new ImportsService()
    const files: Express.Multer.File[] = [
      makeFile('good.csv', 'text/csv', 'id,name\n1,Alice'),
      makeFile('bad.exe', 'application/x-msdownload', 'MZ'),
    ]
    const session = await service.upload(files)
    assert.equal(session.files.length, 2)
    const goodFiles = session.files.filter((f) => f.status === 'inspected')
    const badFiles = session.files.filter((f) => f.status === 'error')
    assert.equal(goodFiles.length, 1)
    assert.equal(badFiles.length, 1)
  })

  it('retains every parsed row while keeping the API preview bounded', async () => {
    const service = new ImportsService()
    const rows = Array.from({ length: 125 }, (_, index) => `${index + 1},User ${index + 1}`)
    const session = await service.upload([makeFile('complete.csv', 'text/csv', `id,name\n${rows.join('\n')}`)])
    const file = session.files[0]
    assert.equal(file.sheets[0].previewRows.length, IMPORT_CONFIG.previewRows)
    assert.equal((await service.getSheetRows(session.importId, file.id, 0)).length, 125)
    assert.equal('allRows' in file.sheets[0], false)
  })
})

describe('ImportsService - Progress', () => {
  it('should report progress after upload', async () => {
    const service = new ImportsService()
    const session = await service.upload([makeFile('prog.csv', 'text/csv', 'id,name\n1,Alice\n2,Bob')])
    const progress = service.getProgress(session.importId)
    assert.ok(progress !== null)
    assert.equal(progress!.status, 'completed')
    assert.equal(progress!.totalRows, 2)
    assert.equal(progress!.filesCompleted, 1)
  })

  it('should return null for unknown session progress', () => {
    const service = new ImportsService()
    assert.equal(service.getProgress('nonexistent'), null)
  })
})

describe('ImportsService - Cancel', () => {
  it('should cancel a session', async () => {
    const service = new ImportsService()
    const session = await service.upload([makeFile('cancel.csv', 'text/csv', 'id,name\n1,Alice')])
    const result = service.cancel(session.importId)
    assert.equal(result, true)
    const progress = service.getProgress(session.importId)
    assert.equal(progress!.status, 'cancelled')
  })

  it('should return false for unknown session cancel', () => {
    const service = new ImportsService()
    assert.equal(service.cancel('nonexistent'), false)
  })

  it('does not return a cancelled session as the active import', async () => {
    const service = new ImportsService()
    const first = await service.upload([makeFile('active.csv', 'text/csv', 'id,name\n1,Alice')])
    const second = await service.upload([makeFile('cancelled.csv', 'text/csv', 'id,name\n2,Bob')])
    service.cancel(second.importId)
    assert.equal(service.getLatestSession()?.importId, first.importId)
  })
})

describe('ImportsService - Retry', () => {
  it('should return null for unknown file retry', async () => {
    const service = new ImportsService()
    assert.equal(await service.retryFile('nonexistent', 'nonexistent'), null)
  })
})

describe('ImportsService - Remove file', () => {
  it('should remove a file from session', async () => {
    const service = new ImportsService()
    const session = await service.upload([makeFile('remove.csv', 'text/csv', 'id,name\n1,Alice')])
    assert.equal(session.files.length, 1)
    const removed = service.removeFile(session.importId, session.files[0].id)
    assert.ok(removed !== null)
    assert.equal(removed!.files.length, 0)
  })

  it('should return null for unknown file remove', () => {
    const service = new ImportsService()
    assert.equal(service.removeFile('nonexistent', 'nonexistent'), null)
  })
})

describe('ImportsService - Session cleanup', () => {
  it('should handle expired session cleanup', () => {
    const service = new ImportsService()
    const count = service.cleanupExpiredSessions()
    assert.equal(typeof count, 'number')
  })
})

describe('ImportsService - Truncation', () => {
  it('should provide truncation info in limits', () => {
    const service = new ImportsService()
    const limits = service.getLimits()
    assert.ok(limits.maxRowsPerSheet > 0)
  })
})

describe('ImportsService - Unauthorized extension', () => {
  it('should reject disallowed file types', async () => {
    const service = new ImportsService()
    const session = await service.upload([makeFile('hack.exe', 'application/x-msdownload', 'MZ')])
    assert.equal(session.files.length, 1)
    assert.equal(session.files[0].status, 'error')
  })
})

function makeFile(name: string, mime: string, content: string): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: name,
    encoding: '7bit',
    mimetype: mime,
    size: Buffer.byteLength(content),
    buffer: Buffer.from(content),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  }
}
