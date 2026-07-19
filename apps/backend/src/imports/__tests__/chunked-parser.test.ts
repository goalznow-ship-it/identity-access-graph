import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { parseCsvChunked } from '../parsers/chunked-parser'
import { IMPORT_CONFIG } from '../import-config'

const target = path.resolve(process.cwd(), '.imports-tmp', 'chunked-parser-test.csv')
after(() => { if (fs.existsSync(target)) fs.unlinkSync(target) })

describe('chunked CSV parser', () => {
  it('processes data in bounded chunks and supports a row checkpoint', async () => {
    const total = IMPORT_CONFIG.chunkSizeRows * 2 + 17
    fs.writeFileSync(target, `id,name,notes\n${Array.from({ length: total }, (_, index) => `${index + 1},"User ${index + 1}","quoted, value"`).join('\n')}`)
    const chunks: { start: number; rows: Record<string, unknown>[] }[] = [], checkpoints: Record<string, unknown>[] = []
    const result = await parseCsvChunked(target, 'users', { onChunk: async (_sheet, _chunk, start, rows) => { chunks.push({ start, rows }) }, onProgress: async (value) => { checkpoints.push(value) }, isCancelled: () => false })
    assert.equal(result.rowCount, total)
    assert.equal(chunks.length, 3)
    assert.ok(chunks.every((chunk) => chunk.rows.length <= IMPORT_CONFIG.chunkSizeRows))
    assert.equal(chunks[0].rows[0].notes, 'quoted, value')
    assert.equal(result.previewRows.length, IMPORT_CONFIG.previewRows)
    assert.ok(checkpoints.length >= 2)

    const resumed: Record<string, unknown>[][] = []
    await parseCsvChunked(target, 'users', { resumeRows: IMPORT_CONFIG.chunkSizeRows * 2, onChunk: async (_sheet, _chunk, _start, rows) => { resumed.push(rows) }, onProgress: async () => {}, isCancelled: () => false })
    assert.equal(resumed.flat().length, 17)
  })
})
