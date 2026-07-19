import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateConnectorCreate, validateConnectorUpdate, validateSyncOptions } from '../connector-validation'
import { ConnectorsController } from '../connectors.controller'

describe('connector API mutation validation', () => {
  it('rejects invalid connector types and internal fields', () => {
    assert.throws(() => validateConnectorCreate({ name: 'Bad', connectorType: 'UNKNOWN', configuration: {} }), /Invalid connector type/)
    assert.throws(() => validateConnectorUpdate({ status: 'CONNECTED' }), /Unknown connector field/)
  })

  it('accepts the public create and update contract', () => {
    const created = validateConnectorCreate({ name: 'Directory', connectorType: 'ACTIVE_DIRECTORY', enabled: false, configuration: { url: 'ldaps://directory' } })
    assert.equal(created.connectorType, 'ACTIVE_DIRECTORY')
    assert.deepEqual(validateConnectorUpdate({ name: 'Renamed', enabled: true }), { name: 'Renamed', enabled: true })
  })

  it('strictly validates synchronization options', () => {
    assert.throws(() => validateSyncOptions({ mode: 'SOMETIME' }), /Invalid sync mode/)
    assert.throws(() => validateSyncOptions({ persist: 'yes' }), /persist must be boolean/)
    assert.throws(() => validateSyncOptions({ previewLimit: 501 }), /between 1 and 500/)
    assert.throws(() => validateSyncOptions({ unexpected: true }), /Unknown sync option/)
    assert.deepEqual(validateSyncOptions({ mode: 'FULL', convert: true, persist: true, runRiskScan: true }), { mode: 'FULL', convert: true, persist: true, runRiskScan: true })
  })

  it('prevents changing the connector implementation after creation', () => {
    const service = {
      get: () => ({ connectorType: 'ACTIVE_DIRECTORY' }),
      update: () => { throw new Error('must not update') },
    }
    const controller = new ConnectorsController(service as any)
    assert.throws(() => controller.update('connector-1', { connectorType: 'ENTRA_ID' }), /cannot be changed/)
  })
})
