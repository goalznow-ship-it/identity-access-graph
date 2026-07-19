import 'reflect-metadata'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import { DataSource } from 'typeorm'
import { ConnectorRepository } from '../../connectors/connector.repository'
import { ConnectorStatus, ConnectorType, SyncMode, type Connector } from '../../connectors/connector.types'
import {
  AttackPathEntity,
  DATABASE_ENTITIES,
  ConnectorEntity,
  ConnectorSyncRunEntity,
  EnterpriseIdentityEntity,
  GraphSnapshotEntity,
  ImportSessionEntity,
  ImportAuditLogEntity,
  ImportJobEntity,
  ImportRowChunkEntity,
  ImportValidationIssueEntity,
  OperationalMetadataEntity,
  PipelineRunEntity,
  RiskFindingEntity,
} from '../entities'
import { InitialOperationalPersistence1721380800000 } from '../migrations/1721380800000-InitialOperationalPersistence'
import { EnterpriseImportEngine1721467200000 } from '../migrations/1721467200000-EnterpriseImportEngine'
import { OperationalStoreService } from '../operational-store.service'
import { ImportQueueService } from '../../imports/import-queue.service'
import { ImportReportingService } from '../../imports/import-reporting.service'

const databaseUrl = process.env.TEST_DATABASE_URL

function connector(id = randomUUID(), name = 'Integration connector'): Connector {
  const now = new Date().toISOString()
  return {
    id,
    name,
    connectorType: ConnectorType.GENERIC_LDAP,
    status: ConnectorStatus.CONFIGURED,
    enabled: true,
    configuration: { url: 'ldaps://directory.test', baseDn: 'dc=test' },
    capabilities: ['FULL_SYNC'],
    createdAt: now,
    updatedAt: now,
  }
}

describe('PostgreSQL persistence integration', { skip: databaseUrl ? false : 'TEST_DATABASE_URL is not configured' }, () => {
  let dataSource: DataSource
  let repository: ConnectorRepository
  let store: OperationalStoreService

  before(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: DATABASE_ENTITIES,
      migrations: [InitialOperationalPersistence1721380800000, EnterpriseImportEngine1721467200000],
      synchronize: false,
    })
    await dataSource.initialize()
    await dataSource.dropDatabase()
    repository = new ConnectorRepository(dataSource.getRepository(ConnectorEntity), dataSource.getRepository(ConnectorSyncRunEntity))
    store = new OperationalStoreService(
      dataSource.getRepository(ImportSessionEntity),
      dataSource.getRepository(GraphSnapshotEntity),
      dataSource.getRepository(RiskFindingEntity),
      dataSource.getRepository(AttackPathEntity),
      dataSource.getRepository(EnterpriseIdentityEntity),
      dataSource.getRepository(PipelineRunEntity),
      dataSource.getRepository(OperationalMetadataEntity),
    )
  })

  after(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy()
  })

  it('runs the versioned migration once and supports rollback and re-apply', async () => {
    const firstRun = await dataSource.runMigrations({ transaction: 'all' })
    assert.equal(firstRun.length, 2)
    assert.equal(await dataSource.getRepository(ConnectorEntity).count(), 0)
    assert.equal((await dataSource.runMigrations({ transaction: 'all' })).length, 0)

    await dataSource.undoLastMigration({ transaction: 'all' })
    const tableAfterRollback = await dataSource.query(`SELECT to_regclass('public.import_jobs') AS name`)
    assert.equal(tableAfterRollback[0].name, null)
    assert.equal((await dataSource.runMigrations({ transaction: 'all' })).length, 1)
  })

  it('creates, reads, updates, and deletes connectors and sync runs', async () => {
    const value = connector()
    repository.save(value)
    repository.saveRun({ syncRunId: randomUUID(), connectorId: value.id, mode: SyncMode.FULL, status: 'COMPLETED', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), objectCounts: { users: 2 }, pageCounts: { users: 1 }, warnings: [], errors: [] })
    await repository.flush()

    assert.equal(repository.get(value.id)?.name, 'Integration connector')
    assert.equal(repository.runsFor(value.id).length, 1)
    repository.save({ ...value, name: 'Updated connector', updatedAt: new Date().toISOString() })
    await repository.flush()
    assert.equal((await dataSource.getRepository(ConnectorEntity).findOneByOrFail({ id: value.id })).name, 'Updated connector')

    assert.equal(repository.delete(value.id), true)
    await repository.flush()
    assert.equal(await dataSource.getRepository(ConnectorEntity).countBy({ id: value.id }), 0)
    assert.equal(await dataSource.getRepository(ConnectorSyncRunEntity).countBy({ connectorId: value.id }), 0)
  })

  it('hydrates a fresh repository instance after a simulated restart', async () => {
    const value = connector()
    repository.save(value)
    await repository.flush()

    const restarted = new ConnectorRepository(dataSource.getRepository(ConnectorEntity), dataSource.getRepository(ConnectorSyncRunEntity))
    await restarted.onModuleInit()
    assert.deepEqual(restarted.get(value.id), value)
  })

  it('handles concurrent writes without losing records', async () => {
    const values = Array.from({ length: 24 }, (_, index) => connector(randomUUID(), `Concurrent ${index}`))
    values.forEach((value) => repository.save(value))
    await repository.flush()
    const count = await dataSource.getRepository(ConnectorEntity).countBy(values.map(({ id }) => ({ id })))
    assert.equal(count, values.length)
  })

  it('rolls back all writes when a transaction fails', async () => {
    const id = `rollback-${randomUUID()}`
    await assert.rejects(store.transaction(async (manager) => {
      await manager.save(GraphSnapshotEntity, { id, payload: { shouldPersist: false } })
      throw new Error('intentional rollback')
    }), /intentional rollback/)
    assert.equal(await dataSource.getRepository(GraphSnapshotEntity).findOneBy({ id }), null)
  })

  it('persists operational JSON state across store instances', async () => {
    const id = `snapshot-${randomUUID()}`
    store.saveGraph(id, { nodes: [{ id: 'node-1' }], relationships: [] })
    await store.flush()

    const row = await dataSource.getRepository(GraphSnapshotEntity).findOneByOrFail({ id })
    assert.deepEqual(row.payload, { nodes: [{ id: 'node-1' }], relationships: [] })
    await dataSource.getRepository(GraphSnapshotEntity).delete(id)
    assert.equal(await dataSource.getRepository(GraphSnapshotEntity).findOneBy({ id }), null)
  })

  it('claims durable import jobs once and records their audit lifecycle', async () => {
    const importId = randomUUID(), fileId = randomUUID(), now = Date.now()
    await dataSource.getRepository(ImportSessionEntity).save({ importId, status: 'parsing', cancelled: false, payload: {}, createdAt: new Date(now), expiresAt: new Date(now + 60_000) })
    const queue = new ImportQueueService(dataSource, dataSource.getRepository(ImportJobEntity), dataSource.getRepository(ImportAuditLogEntity))
    const queued = await queue.enqueue(importId, fileId)
    const [first, second] = await Promise.all([queue.claim('worker-a'), queue.claim('worker-b')])
    assert.equal([first, second].filter(Boolean).length, 1)
    assert.equal((first ?? second)?.id, queued.id)
    await queue.checkpoint(queued.id, { row: 5000 })
    await queue.complete((first ?? second)!)
    assert.equal((await queue.jobsFor(importId))[0].status, 'COMPLETED')
    assert.deepEqual((await queue.jobsFor(importId))[0].checkpoint, { row: 5000 })
    assert.deepEqual((await queue.auditFor(importId)).map((entry) => entry.event), ['JOB_QUEUED', 'JOB_COMPLETED'])
  })

  it('builds durable history, validation, duplicate, error, and statistics reports', async () => {
    const importId = randomUUID(), fileId = randomUUID(), now = Date.now()
    await dataSource.getRepository(ImportSessionEntity).save({ importId, status: 'completed', cancelled: false, payload: { session: { importId, files: [{ id: fileId, status: 'inspected', size: 42 }] } }, createdAt: new Date(now), expiresAt: new Date(now + 60_000) })
    await dataSource.getRepository(ImportRowChunkEntity).save({ importId, fileId, sheetIndex: 0, chunkIndex: 0, rowStart: 1, rowEnd: 2, rows: [{ id: '1' }, { id: '1' }] })
    const reporting = new ImportReportingService(dataSource.getRepository(ImportSessionEntity), dataSource.getRepository(ImportJobEntity), dataSource.getRepository(ImportAuditLogEntity), dataSource.getRepository(ImportRowChunkEntity), dataSource.getRepository(ImportValidationIssueEntity))
    await reporting.saveValidation({ importId, fileId, sheetIndex: 0, summary: { total: 1, info: 0, warning: 0, error: 1, critical: 0 }, issues: [{ code: 'DUP_ID', severity: 'ERROR', message: 'Duplicate ID', file: 'users.csv', sheet: 'users', row: 2, sourceColumn: 'id', targetField: 'id', rawValue: '1', suggestedResolution: 'Remove duplicate.' }] })
    const report = await reporting.validationReport(importId), statistics = await reporting.statistics(importId)
    assert.equal(report.summary.error, 1)
    assert.match(await reporting.errorCsv(importId), /Duplicate ID/)
    assert.equal(statistics?.rows, 2)
    assert.equal(statistics?.duplicates, 1)
    assert.ok((await reporting.history()).imports.some((item) => item.importId === importId))
  })
})
