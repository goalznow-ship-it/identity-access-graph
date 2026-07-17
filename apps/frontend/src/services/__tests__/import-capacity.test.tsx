import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImportLimitsPanel } from '../../components/imports/ImportLimitsPanel'
import type { ImportLimits } from '../../types/import'

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
})
