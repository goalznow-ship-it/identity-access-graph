import { ConflictException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { GraphService } from '../../graph'
import { GraphConversionService, IdentityCorrelationService } from '../../imports'
import { RiskService } from '../../risk'
import { ConnectorRepository } from '../connector.repository'
import { ConnectorStatus, SyncMode, type Connector, type SyncOptions, type SyncRun } from '../connector.types'
import { EntraIdConnector } from './entra-id.connector'
import { mapEntraGraph } from './entra-id.mapper'

@Injectable()
export class EntraIdSyncService {
  private active = new Set<string>()

  constructor(
    private extraction: EntraIdConnector,
    private repository: ConnectorRepository,
    private correlation: IdentityCorrelationService,
    private conversion: GraphConversionService,
    private graph: GraphService,
    private risk: RiskService,
  ) {}

  async run(connector: Connector, options: SyncOptions = {}): Promise<SyncRun> {
    if (this.active.has(connector.id)) throw new ConflictException('A sync is already running')
    this.active.add(connector.id)
    const started = Date.now()
    const mode = options.mode ?? SyncMode.PREVIEW
    const run: SyncRun = {
      syncRunId: randomUUID(),
      connectorId: connector.id,
      mode,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      objectCounts: {},
      pageCounts: {},
      warnings: [],
      errors: [],
    }
    this.repository.saveRun(run)
    connector.status = ConnectorStatus.SYNCING
    this.repository.save(connector)

    try {
      const limit = mode === SyncMode.PREVIEW ? Math.min(500, Math.max(1, options.previewLimit ?? 100)) : undefined
      const watermark = mode === SyncMode.INCREMENTAL ? connector.lastSuccessfulSyncAt : undefined
      const result = await this.extraction.extract(connector, limit, watermark)

      const counts = result.objects.reduce<Record<string, number>>((out, item) => {
        out[item.objectType] = (out[item.objectType] ?? 0) + 1
        return out
      }, {})

      const records = result.objects.map(object => ({
        recordId: object.recordId,
        sourceSystem: 'ENTRA_ID',
        sourceId: object.id,
        sourceFile: `connector:${connector.id}`,
        sourceSheet: object.objectType,
        fields: {
          ...object.attributes,
          nodeType: object.objectType,
          objectId: object.id,
          employeeId: object.attributes.employeeId,
          email: object.attributes.mail,
          userPrincipalName: object.attributes.userPrincipalName,
          username: object.attributes.onPremisesSamAccountName ?? object.attributes.userPrincipalName,
          samAccountName: object.attributes.onPremisesSamAccountName,
          sid: object.attributes.onPremisesSecurityIdentifier,
          objectGUID: object.id,
        },
      }))

      const correlation = this.correlation.correlate(run.syncRunId, records as any)
      const conversion = this.conversion.convert(run.syncRunId, records as any, correlation)
      const mapped = mapEntraGraph(result.objects, connector.id, run.syncRunId)

      let persisted = false
      let riskScanned = false
      if (options.persist) {
        await this.graph.applyVersioned(`connector:${connector.id}`, mapped.nodes, mapped.relationships, { connectorId: connector.id, syncRunId: run.syncRunId, mode })
        persisted = true
      }
      if (options.runRiskScan) {
        await this.risk.scan({ graphSource: options.persist ? 'neo4j' : 'memory' })
        riskScanned = true
      }

      const preview = result.objects.slice(0, Math.min(limit ?? 100, 100)).map(obj => ({
        objectType: obj.objectType,
        id: obj.id,
        displayName: obj.attributes.displayName,
        userPrincipalName: obj.attributes.userPrincipalName,
      }))

      Object.assign(run, {
        status: 'COMPLETED' as const,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        objectCounts: counts,
        pageCounts: result.pageCounts,
        watermark: new Date().toISOString(),
        preview,
        pipeline: {
          correlated: correlation.summary.identities,
          nodesCreated: options.convert ? mapped.nodes.length : conversion.nodesCreated,
          relationshipsCreated: options.convert ? mapped.relationships.length : conversion.relationshipsCreated,
          persisted,
          riskScanned,
        },
      })

      connector.status = ConnectorStatus.CONNECTED
      connector.lastSyncAt = run.completedAt
      connector.lastSuccessfulSyncAt = run.completedAt
      connector.lastError = undefined
      return this.repository.saveRun(run)
    } catch (error) {
      run.status = 'FAILED'
      run.completedAt = new Date().toISOString()
      run.durationMs = Date.now() - started
      run.errors.push((error as Error).message)
      connector.status = ConnectorStatus.FAILED
      connector.lastError = (error as Error).message
      this.repository.saveRun(run)
      throw error
    } finally {
      connector.updatedAt = new Date().toISOString()
      this.repository.save(connector)
      this.active.delete(connector.id)
      await this.repository.flush()
    }
  }
}
