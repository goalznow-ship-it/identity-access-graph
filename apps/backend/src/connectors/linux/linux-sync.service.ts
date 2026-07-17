import { ConflictException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { GraphService } from '../../graph'
import { GraphConversionService, IdentityCorrelationService } from '../../imports'
import { RiskService } from '../../risk'
import { ConnectorRepository } from '../connector.repository'
import { ConnectorStatus, SyncMode, type Connector, type SyncOptions, type SyncRun } from '../connector.types'
import { LinuxSshConnector } from './linux-ssh.connector'
import { buildLinuxGraph } from './linux-mapper'

@Injectable()
export class LinuxSshSyncService {
  private active = new Set<string>()

  constructor(
    private extraction: LinuxSshConnector,
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
      const limit = mode === SyncMode.PREVIEW ? Math.min(500, Math.max(1, options.previewLimit ?? 100)) : 100000
      const result = await this.extraction.extract(connector, limit)

      const objectCounts: Record<string, number> = {
        PASSWD_ENTRIES: result.passwd.length,
        GROUP_ENTRIES: result.groups.length,
        SUDO_RULES: result.sudoRules.length,
        SSH_KEYS: result.authorizedKeys.length,
      }
      run.warnings.push(...result.warnings)

      const { nodes, relationships, warnings: graphWarnings } = buildLinuxGraph(
        result.passwd,
        result.groups,
        result.sudoRules,
        result.authorizedKeys,
        result.hostIdentity,
        connector.id,
        run.syncRunId,
        new Date().toISOString(),
      )
      run.warnings.push(...graphWarnings)

      const records = result.passwd.filter(p => p.uid >= 1000).map(p => ({
        recordId: `linux:user:${p.username}`,
        sourceSystem: 'LINUX',
        sourceId: p.username,
        sourceFile: `connector:${connector.id}`,
        sourceSheet: 'passwd',
        fields: {
          username: p.username,
          uid: p.uid,
          gid: p.gid,
          shell: p.shell,
          employeeId: `linux:${p.username}`,
          nodeType: 'LINUX_USER',
          sourceSystem: 'LINUX',
        },
      }))

      const correlation = this.correlation.correlate(run.syncRunId, records as any)
      const conversion = this.conversion.convert(run.syncRunId, records as any, correlation)

      let persisted = false
      let riskScanned = false
      if (options.persist) {
        await this.graph.upsertNodes(nodes)
        await this.graph.upsertRelationships(relationships)
        persisted = true
      }
      if (options.runRiskScan) {
        await this.risk.scan({ graphSource: options.persist ? 'neo4j' : 'memory' })
        riskScanned = true
      }

      const safePreview = {
        hosts: result.hostIdentity,
        userCount: result.passwd.filter(p => p.uid >= 1000).length,
        systemAccountCount: result.passwd.filter(p => p.uid < 1000).length,
        groupCount: result.groups.length,
        sudoRuleCount: result.sudoRules.length,
        sshKeyCount: result.authorizedKeys.length,
        warnings: run.warnings,
      }

      Object.assign(run, {
        status: 'COMPLETED' as const,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        objectCounts,
        pageCounts: {},
        watermark: new Date().toISOString(),
        preview: [safePreview],
        pipeline: {
          correlated: correlation.summary.identities,
          nodesCreated: options.convert ? nodes.length : conversion.nodesCreated,
          relationshipsCreated: options.convert ? relationships.length : conversion.relationshipsCreated,
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
