import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImportLimitsPanel } from '../../components/imports/ImportLimitsPanel'
import type { ImportLimits } from '../../types/import'
import { uploadErrorMessage } from '../importApi'

describe('ImportLimitsPanel', () => {
  const limits: ImportLimits = {
    maxFileSizeMb: 250,
    maxFilesPerSession: 50,
    maxRowsPerFile: 1_000_000,
    maxRowsPerSheet: 500_000,
    maxSheetsPerWorkbook: 100,
    previewRows: 100,
    previewColumns: 100,
    maxCellLength: 20000,
    sessionTtlMinutes: 240,
    maxConcurrentSessions: 10,
    maxConcurrentFiles: 3,
    chunkSizeRows: 5000,
  }

  it('renders limits panel with correct values', () => {
    const html = renderToStaticMarkup(<ImportLimitsPanel limits={limits} />)
    assert.match(html, /250 MB/)
    assert.match(html, /500,000/)
    assert.match(html, /100/)
    assert.match(html, /240 min/)
  })

  it('renders all limit labels', () => {
    const html = renderToStaticMarkup(<ImportLimitsPanel limits={limits} />)
    assert.match(html, /Max file size/)
    assert.match(html, /Max rows per sheet/)
    assert.match(html, /Preview rows/)
    assert.match(html, /Session timeout/)
  })

  it('turns proxy and backend upload failures into safe messages', async () => {
    assert.equal(await uploadErrorMessage(new Response('<html>nginx</html>', { status: 413, headers: { 'content-type': 'text/html' } })), 'Upload failed: file exceeds the configured server limit.')
    assert.equal(await uploadErrorMessage(new Response(JSON.stringify({ message: 'Unsupported file type.' }), { status: 400, headers: { 'content-type': 'application/json' } })), 'Upload failed: Unsupported file type.')
    assert.equal(await uploadErrorMessage(new Response('<html>gateway failed</html>', { status: 502, headers: { 'content-type': 'text/html' } })), 'Upload failed: server returned 502.')
  })
})
