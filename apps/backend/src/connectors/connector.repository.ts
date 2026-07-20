import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { ConnectorEntity, ConnectorSyncRunEntity } from '../database/entities'
import type { Connector, SyncRun } from './connector.types'

@Injectable()
export class ConnectorRepository implements OnModuleInit {
  private readonly logger = new Logger(ConnectorRepository.name)
  private connectors = new Map<string, Connector>()
  private runs = new Map<string, SyncRun[]>()
  private pending = new Set<Promise<unknown>>()
  private writeErrors: Error[] = []

  constructor(
    @Optional() @InjectRepository(ConnectorEntity) private readonly connectorStore?: Repository<ConnectorEntity>,
    @Optional() @InjectRepository(ConnectorSyncRunEntity) private readonly runStore?: Repository<ConnectorSyncRunEntity>,
  ) {}

  async onModuleInit() {
    if (!this.connectorStore || !this.runStore) return
    const [connectors, runs] = await Promise.all([this.connectorStore.find({ order: { createdAt: 'ASC' } }), this.runStore.find({ order: { startedAt: 'DESC' } })])
    this.connectors = new Map(connectors.map((row) => [row.id, row.payload as unknown as Connector]))
    this.runs.clear()
    for (const row of runs) {
      const values = this.runs.get(row.connectorId) ?? []
      values.push(row.payload as unknown as SyncRun)
      this.runs.set(row.connectorId, values)
    }
  }

  list() { return [...this.connectors.values()] }
  get(id: string) { return this.connectors.get(id) }
  save(connector: Connector) {
    this.connectors.set(connector.id, connector)
    if (this.connectorStore) this.track(this.connectorStore.save({ id: connector.id, name: connector.name, connectorType: connector.connectorType, status: connector.status, enabled: connector.enabled, payload: connector as unknown as Record<string, unknown> }))
    return connector
  }
  delete(id: string) {
    this.runs.delete(id)
    const deleted = this.connectors.delete(id)
    if (this.connectorStore) this.track(this.connectorStore.delete(id))
    return deleted
  }
  saveRun(run: SyncRun) {
    const values = this.runs.get(run.connectorId) ?? []
    const index = values.findIndex((item) => item.syncRunId === run.syncRunId)
    if (index >= 0) values[index] = run
    else values.unshift(run)
    this.runs.set(run.connectorId, values)
    if (this.runStore) this.track(this.runStore.save({ syncRunId: run.syncRunId, connectorId: run.connectorId, status: run.status, mode: run.mode, payload: run as unknown as Record<string, unknown>, startedAt: new Date(run.startedAt), completedAt: run.completedAt ? new Date(run.completedAt) : null }))
    return run
  }
  runsFor(id: string) { return this.runs.get(id) ?? [] }
  run(id: string, runId: string) { return this.runsFor(id).find((run) => run.syncRunId === runId) }
  async flush() { await Promise.all([...this.pending]); const error = this.writeErrors.shift(); if (error) throw error }

  private track<T>(operation: Promise<T>) {
    this.pending.add(operation)
    operation.catch((error: Error) => { this.writeErrors.push(error); this.logger.error(`PostgreSQL connector write failed: ${error.message}`) }).finally(() => this.pending.delete(operation))
  }
}
