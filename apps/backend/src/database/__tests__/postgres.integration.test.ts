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
  OperationalMetadataEntity,
  PipelineRunEntity,
  RiskFindingEntity,
} from '../entities'
import { InitialOperationalPersistence1721380800000 } from '../migrations/1721380800000-InitialOperationalPersistence'
import { OperationalStoreService } from '../operational-store.service'

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
      migrations: [InitialOperationalPersistence1721380800000],
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
    assert.equal(firstRun.length, 1)
    assert.equal(await dataSource.getRepository(ConnectorEntity).count(), 0)
    assert.equal((await dataSource.runMigrations({ transaction: 'all' })).length, 0)

    await dataSource.undoLastMigration({ transaction: 'all' })
    const tableAfterRollback = await dataSource.query(`SELECT to_regclass('public.connectors') AS name`)
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
})
