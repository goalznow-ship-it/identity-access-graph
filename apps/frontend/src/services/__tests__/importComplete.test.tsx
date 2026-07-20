import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImportComplete } from '../../components/imports/ImportComplete'
import type { ImportSession } from '../../types/import'

const session: ImportSession = {
  importId: 'test-import-123',
  files: [{
    id: 'f1', originalName: 'test.csv', sanitizedName: 'test.csv', mimeType: 'text/csv', size: 100, status: 'uploaded',
    sheets: [{ name: 'Sheet1', headers: ['Name'], rowCount: 10, warnings: [], columnCount: 1, classification: 'Users', classificationConfidence: 1, previewRows: [] }],
  }],
  createdAt: Date.now(),
}

describe('ImportComplete', () => {
  it('renders Import Complete heading and stats', () => {
    const html = renderToStaticMarkup(
      <ImportComplete importId="test-import-123" session={session} onNewImport={() => {}} />
    )
    assert.match(html, /Import Complete/)
    assert.match(html, /Files processed/)
    assert.match(html, /Graph/)
    assert.match(html, /Start New Import/)
  })

  it('renders persistence summary with node and relationship counts', () => {
    const html = renderToStaticMarkup(
      <ImportComplete
        importId="test-import-123"
        session={session}
        persistenceSummary={{ nodesUpserted: 5283, relationshipsUpserted: 0, skipped: 0, conflicts: 0, durationMs: 1234 }}
        onNewImport={() => {}}
      />
    )
    assert.match(html, /Nodes Created/)
    assert.match(html, /5,283/)
    assert.match(html, /Relationships/)
    assert.match(html, /0/)
  })
})
