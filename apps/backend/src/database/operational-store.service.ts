import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { AttackPathEntity, EnterpriseIdentityEntity, GraphSnapshotEntity, ImportSessionEntity, OperationalMetadataEntity, PipelineRunEntity, RiskFindingEntity } from './entities'

@Injectable()
export class OperationalStoreService {
  private readonly logger = new Logger(OperationalStoreService.name)
  private pending = new Set<Promise<unknown>>()
  private writeErrors: Error[] = []
  constructor(
    @InjectRepository(ImportSessionEntity) private imports: Repository<ImportSessionEntity>,
    @InjectRepository(GraphSnapshotEntity) private graphs: Repository<GraphSnapshotEntity>,
    @InjectRepository(RiskFindingEntity) private findings: Repository<RiskFindingEntity>,
    @InjectRepository(AttackPathEntity) private paths: Repository<AttackPathEntity>,
    @InjectRepository(EnterpriseIdentityEntity) private identities: Repository<EnterpriseIdentityEntity>,
    @InjectRepository(PipelineRunEntity) private pipelines: Repository<PipelineRunEntity>,
    @InjectRepository(OperationalMetadataEntity) private metadata: Repository<OperationalMetadataEntity>,
  ) {}

  loadImports() { return this.imports.find({ where: { cancelled: false }, order: { createdAt: 'ASC' } }) }
  saveImport(row: Partial<ImportSessionEntity> & Pick<ImportSessionEntity, 'importId'>) { this.track(this.imports.save(row)); }
  deleteImport(id: string) { this.track(this.imports.delete(id)); }
  loadGraph(id: string) { return this.graphs.findOneBy({ id }) }
  saveGraph(id: string, payload: Record<string, unknown>) { this.track(this.graphs.save({ id, payload })); }
  loadFindings() { return this.findings.find() }
  saveFinding(row: Partial<RiskFindingEntity> & Pick<RiskFindingEntity, 'id'>) { this.track(this.findings.save(row)); }
  loadPaths() { return this.paths.find() }
  replacePaths(rows: AttackPathEntity[]) {
    this.track(this.paths.manager.transaction(async (manager) => {
      await manager.clear(AttackPathEntity)
      if (rows.length) await manager.save(AttackPathEntity, rows)
    }))
  }
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
