import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { AttackPathEntity, AttackPathRunEntity, EnterpriseIdentityEntity, GraphSnapshotEntity, ImportSessionEntity, OperationalMetadataEntity, PipelineRunEntity, RiskFindingEntity, RiskScanRunEntity } from './entities'

@Injectable()
export class OperationalStoreService {
  private readonly logger = new Logger(OperationalStoreService.name)
  private pending = new Set<Promise<unknown>>()
  private writeErrors: Error[] = []
  constructor(
    @InjectRepository(ImportSessionEntity) private imports: Repository<ImportSessionEntity>,
    @InjectRepository(GraphSnapshotEntity) private graphs: Repository<GraphSnapshotEntity>,
    @InjectRepository(RiskFindingEntity) private findings: Repository<RiskFindingEntity>,
    @InjectRepository(RiskScanRunEntity) private riskScans: Repository<RiskScanRunEntity>,
    @InjectRepository(AttackPathEntity) private paths: Repository<AttackPathEntity>,
    @InjectRepository(EnterpriseIdentityEntity) private identities: Repository<EnterpriseIdentityEntity>,
    @InjectRepository(PipelineRunEntity) private pipelines: Repository<PipelineRunEntity>,
    @InjectRepository(OperationalMetadataEntity) private metadata: Repository<OperationalMetadataEntity>,
    @InjectRepository(AttackPathRunEntity) private attackPathRuns?: Repository<AttackPathRunEntity>,
  ) {}

  loadImports() { return this.imports.find({ where: { cancelled: false }, order: { createdAt: 'ASC' } }) }
  saveImport(row: Partial<ImportSessionEntity> & Pick<ImportSessionEntity, 'importId'>) { this.track(this.imports.save(row)); }
  deleteImport(id: string) { this.track(this.imports.delete(id)); }
  loadGraph(id: string) { return this.graphs.findOneBy({ id }) }
  saveGraph(id: string, payload: Record<string, unknown>) { this.track(this.graphs.save({ id, payload })); }
  loadFindings() { return this.findings.find() }
  saveFinding(row: Partial<RiskFindingEntity> & Pick<RiskFindingEntity, 'id'>) { this.track(this.findings.save(row)); }
  loadRiskScans(limit = 50) { return this.riskScans.find({ order: { startedAt: 'DESC' }, take: Math.min(200, Math.max(1, limit)) }) }
  saveRiskScan(row: Partial<RiskScanRunEntity> & Pick<RiskScanRunEntity, 'id'>) { this.track(this.riskScans.save(row)); }
  loadPaths() { return this.paths.find() }
  async savePaths(rows: AttackPathEntity[]) { if (rows.length) await this.paths.save(rows) }
  loadAttackPathRuns(limit = 50) { return this.attackPathRuns?.find({ order: { startedAt: 'DESC' }, take: Math.min(200, Math.max(1, limit)) }) ?? Promise.resolve([]) }
  saveAttackPathRun(row: Partial<AttackPathRunEntity> & Pick<AttackPathRunEntity, 'id'>) { return this.attackPathRuns?.save(row) ?? Promise.resolve(row as AttackPathRunEntity) }
  loadIdentities() { return this.identities.find() }
  saveIdentity(row: EnterpriseIdentityEntity) { this.track(this.identities.save(row)); }
  async loadLatestPipeline() {
    const [latest] = await this.pipelines.find({ order: { updatedAt: 'DESC' }, take: 1 })
    return latest ?? null
  }
  savePipeline(row: Partial<PipelineRunEntity> & Pick<PipelineRunEntity, 'id'>) { this.track(this.pipelines.save(row)); }
  getMetadata(key: string) { return this.metadata.findOneBy({ key }) }
  setMetadata(key: string, value: Record<string, unknown>) { this.track(this.metadata.save({ key, value })); }
  async flush() {
    await Promise.all([...this.pending])
    const error = this.writeErrors.shift()
    if (error) throw error
  }
  async transaction<T>(work: (manager: EntityManager) => Promise<T>) { return this.imports.manager.transaction(work) }

  private track<T>(promise: Promise<T>) {
    const tracked = promise.catch((error: Error) => {
      this.writeErrors.push(error)
      this.logger.error(`PostgreSQL write failed: ${error.message}`)
    }).finally(() => this.pending.delete(tracked))
    this.pending.add(tracked)
  }
}
