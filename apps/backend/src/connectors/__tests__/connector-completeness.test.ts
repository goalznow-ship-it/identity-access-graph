import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ActiveDirectorySyncService } from '../active-directory/active-directory.sync.service'
import { ConnectorRepository } from '../connector.repository'
import { ConnectorStatus, ConnectorType, SyncMode, type Connector } from '../connector.types'

const connector: Connector = { id: '11111111-1111-4111-8111-111111111111', name: 'AD', connectorType: ConnectorType.ACTIVE_DIRECTORY, status: ConnectorStatus.CONFIGURED, enabled: true, configuration: {}, capabilities: [], createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() }

describe('connector full-dataset persistence', () => {
  it('does not apply a preview-sized ceiling to full sync and writes one graph version', async () => {
    let extractionLimit: number | undefined = 100000, versionWrites = 0
    const extraction = { extract: async (_connector: Connector, limit?: number) => { extractionLimit = limit; return { objects: [], pageCounts: {}, namingContexts: [] } } }
    const graph = { applyVersioned: async () => { versionWrites++; return { counts: {} } } }
    const service = new ActiveDirectorySyncService(extraction as any, new ConnectorRepository(), { correlate: () => ({ summary: { identities: 0 }, groups: [], recordToCanonical: {} }) } as any, { convert: () => ({ nodesCreated: 0, relationshipsCreated: 0 }) } as any, graph as any, { scan: async () => ({}) } as any)
    const run = await service.run({ ...connector }, { mode: SyncMode.FULL, persist: true })
    assert.equal(extractionLimit, undefined)
    assert.equal(versionWrites, 1)
    assert.equal(run.pipeline?.persisted, true)
  })

  it('keeps explicit preview bounds', async () => {
    let extractionLimit: number | undefined
    const extraction = { extract: async (_connector: Connector, limit?: number) => { extractionLimit = limit; return { objects: [], pageCounts: {}, namingContexts: [] } } }
    const service = new ActiveDirectorySyncService(extraction as any, new ConnectorRepository(), { correlate: () => ({ summary: { identities: 0 }, groups: [], recordToCanonical: {} }) } as any, { convert: () => ({ nodesCreated: 0, relationshipsCreated: 0 }) } as any, {} as any, {} as any)
    await service.run({ ...connector }, { mode: SyncMode.PREVIEW, previewLimit: 37 })
    assert.equal(extractionLimit, 37)
  })

  it('propagates PostgreSQL connector history failures on flush', async () => {
    const failure = new Error('database unavailable')
    const store = { find: async () => [], save: async () => { throw failure }, delete: async () => ({}) }
    const repository = new ConnectorRepository(store as any, store as any)
    repository.save({ ...connector })
    await assert.rejects(() => repository.flush(), /database unavailable/)
  })
})
