import { ConflictException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { GraphService } from '../../graph'
import { GraphConversionService, IdentityCorrelationService } from '../../imports'
import { RiskService } from '../../risk'
import { ConnectorRepository } from '../connector.repository'
import { ConnectorStatus, SyncMode, type Connector, type SyncOptions, type SyncRun } from '../connector.types'
import { FreeipaConnector } from './freeipa.connector'
import { mapFreeipaGraph } from './freeipa.mapper'

@Injectable()
export class FreeipaSyncService {
  private active = new Set<string>()

  constructor(
    private extraction: FreeipaConnector,
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
      warnings: ['Deletion detection is not supported.'],
      errors: [],
    }
    this.repository.saveRun(run)
    connector.status = ConnectorStatus.SYNCING
    this.repository.save(connector)

    try {
      const limit = mode === SyncMode.PREVIEW ? Math.min(500, Math.max(1, options.previewLimit ?? 100)) : 100000
      const watermark = mode === SyncMode.INCREMENTAL ? connector.lastSuccessfulSyncAt : undefined
      const result = await this.extraction.extract(connector, limit, watermark)

      const counts = result.objects.reduce<Record<string, number>>((out, item) => {
        out[item.objectType] = (out[item.objectType] ?? 0) + 1
        return out
      }, {})

      const records = result.objects.map(object => ({
        recordId: object.recordId,
        sourceSystem: 'FREEIPA',
        sourceId: object.ipaUniqueID ?? object.dn,
        sourceFile: `connector:${connector.id}`,
        sourceSheet: object.objectType,
        fields: {
          ...object.attributes,
          nodeType: object.objectType,
          distinguishedName: object.dn,
          uid: object.attributes.uid,
          employeeId: object.attributes.employeeNumber,
          email: object.attributes.mail,
          username: object.attributes.uid,
          userPrincipalName: object.attributes.krbPrincipalName,
          ipaUniqueID: object.ipaUniqueID,
        },
      }))

      const correlation = this.correlation.correlate(run.syncRunId, records as any)
      const conversion = this.conversion.convert(run.syncRunId, records as any, correlation)
      const mapped = mapFreeipaGraph(result.objects, connector.id, run.syncRunId)

      let persisted = false
      let riskScanned = false
      if (options.persist) {
        await this.graph.upsertNodes(mapped.nodes)
        await this.graph.upsertRelationships(mapped.relationships)
        persisted = true
      }
      if (options.runRiskScan) {
        await this.risk.scan({ graphSource: options.persist ? 'neo4j' : 'memory' })
        riskScanned = true
      }

      Object.assign(run, {
        status: 'COMPLETED' as const,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        objectCounts: counts,
        pageCounts: result.pageCounts,
        watermark: new Date().toISOString(),
        preview: result.objects.slice(0, Math.min(limit, 100)),
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
    }
  }
}
