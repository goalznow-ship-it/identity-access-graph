import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('connectors')
export class ConnectorEntity {
  @PrimaryColumn('uuid') id!: string
  @Column({ type: 'varchar', length: 255 }) name!: string
  @Index() @Column({ name: 'connector_type', type: 'varchar', length: 64 }) connectorType!: string
  @Index() @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ type: 'boolean', default: false }) enabled!: boolean
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
}

@Entity('connector_sync_runs')
@Index(['connectorId', 'startedAt'])
export class ConnectorSyncRunEntity {
  @PrimaryColumn('uuid', { name: 'sync_run_id' }) syncRunId!: string
  @Column('uuid', { name: 'connector_id' }) connectorId!: string
  @Index() @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ type: 'varchar', length: 32 }) mode!: string
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @Column({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null
}

@Entity('import_sessions')
export class ImportSessionEntity {
  @PrimaryColumn('uuid', { name: 'import_id' }) importId!: string
  @Index() @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ type: 'boolean', default: false }) cancelled!: boolean
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
}

@Entity('graph_snapshots')
export class GraphSnapshotEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 }) id!: string
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
}

@Entity('risk_findings')
export class RiskFindingEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 }) id!: string
  @Index() @Column({ name: 'rule_id', type: 'varchar', length: 128 }) ruleId!: string
  @Index() @Column({ type: 'varchar', length: 32 }) severity!: string
  @Index() @Column({ type: 'varchar', length: 64 }) category!: string
  @Index() @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ type: 'integer' }) score!: number
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @Column({ name: 'first_detected', type: 'timestamptz' }) firstDetected!: Date
  @Column({ name: 'last_detected', type: 'timestamptz' }) lastDetected!: Date
}

@Entity('risk_scan_runs')
export class RiskScanRunEntity {
  @PrimaryColumn('uuid') id!: string
  @Index() @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ name: 'graph_source', type: 'varchar', length: 32 }) graphSource!: string
  @Column({ name: 'rules_run', type: 'integer', default: 0 }) rulesRun!: number
  @Column({ name: 'findings_detected', type: 'integer', default: 0 }) findingsDetected!: number
  @Column({ name: 'findings_resolved', type: 'integer', default: 0 }) findingsResolved!: number
  @Column({ name: 'duration_ms', type: 'integer', nullable: true }) durationMs!: number | null
  @Column({ type: 'jsonb', default: {} }) payload!: Record<string, unknown>
  @Column({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null
}

@Entity('attack_paths')
export class AttackPathEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 }) id!: string
  @Index() @Column({ type: 'integer', name: 'risk_score' }) riskScore!: number
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
}

@Entity('enterprise_identities')
export class EnterpriseIdentityEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 }) id!: string
  @Index() @Column({ name: 'canonical_identity_id', type: 'varchar', length: 128 }) canonicalIdentityId!: string
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
}

@Entity('pipeline_runs')
export class PipelineRunEntity {
  @PrimaryColumn('uuid') id!: string
  @Index() @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true }) startedAt!: Date | null
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
}

@Entity('operational_metadata')
export class OperationalMetadataEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 }) key!: string
  @Column({ type: 'jsonb' }) value!: Record<string, unknown>
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
}

@Entity('import_jobs')
@Index(['status', 'nextAttemptAt'])
export class ImportJobEntity {
  @PrimaryColumn('uuid') id!: string
  @Index() @Column('uuid', { name: 'import_id' }) importId!: string
  @Column('uuid', { name: 'file_id' }) fileId!: string
  @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ type: 'integer', default: 0 }) attempts!: number
  @Column({ name: 'max_attempts', type: 'integer', default: 3 }) maxAttempts!: number
  @Column({ type: 'jsonb', default: {} }) checkpoint!: Record<string, unknown>
  @Column({ type: 'text', nullable: true }) error!: string | null
  @Column({ name: 'locked_by', type: 'varchar', length: 128, nullable: true }) lockedBy!: string | null
  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true }) lockedAt!: Date | null
  @Column({ name: 'next_attempt_at', type: 'timestamptz', default: () => 'now()' }) nextAttemptAt!: Date
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null
}

@Entity('import_row_chunks')
@Index(['importId', 'fileId', 'sheetIndex', 'chunkIndex'], { unique: true })
export class ImportRowChunkEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id!: string
  @Column('uuid', { name: 'import_id' }) importId!: string
  @Column('uuid', { name: 'file_id' }) fileId!: string
  @Column({ name: 'sheet_index', type: 'integer' }) sheetIndex!: number
  @Column({ name: 'chunk_index', type: 'integer' }) chunkIndex!: number
  @Column({ name: 'row_start', type: 'integer' }) rowStart!: number
  @Column({ name: 'row_end', type: 'integer' }) rowEnd!: number
  @Column({ type: 'jsonb' }) rows!: Record<string, unknown>[]
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
}

@Entity('import_audit_log')
@Index(['importId', 'createdAt'])
export class ImportAuditLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id!: string
  @Column('uuid', { name: 'import_id' }) importId!: string
  @Column({ type: 'varchar', length: 64 }) event!: string
  @Column({ type: 'varchar', length: 128, default: 'system' }) actor!: string
  @Column({ type: 'jsonb', default: {} }) details!: Record<string, unknown>
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
}

@Entity('import_validation_issues')
@Index(['importId', 'severity'])
export class ImportValidationIssueEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id!: string
  @Column('uuid', { name: 'import_id' }) importId!: string
  @Column('uuid', { name: 'file_id' }) fileId!: string
  @Column({ name: 'sheet_index', type: 'integer' }) sheetIndex!: number
  @Column({ type: 'integer' }) row!: number
  @Column({ type: 'varchar', length: 32 }) severity!: string
  @Column({ type: 'varchar', length: 128 }) code!: string
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
}

@Entity('graph_versions')
export class GraphVersionEntity {
  @PrimaryColumn('uuid') id!: string
  @Index({ unique: true }) @Column({ type: 'bigint' }) sequence!: string
  @Column({ type: 'varchar', length: 32 }) status!: string
  @Column({ type: 'varchar', length: 128 }) source!: string
  @Column({ type: 'text', nullable: true }) description!: string | null
  @Column({ name: 'parent_version_id', type: 'uuid', nullable: true }) parentVersionId!: string | null
  @Column({ name: 'nodes_added', type: 'integer', default: 0 }) nodesAdded!: number
  @Column({ name: 'nodes_updated', type: 'integer', default: 0 }) nodesUpdated!: number
  @Column({ name: 'nodes_deleted', type: 'integer', default: 0 }) nodesDeleted!: number
  @Column({ name: 'relationships_added', type: 'integer', default: 0 }) relationshipsAdded!: number
  @Column({ name: 'relationships_updated', type: 'integer', default: 0 }) relationshipsUpdated!: number
  @Column({ name: 'relationships_deleted', type: 'integer', default: 0 }) relationshipsDeleted!: number
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null
}

export const DATABASE_ENTITIES = [ConnectorEntity, ConnectorSyncRunEntity, ImportSessionEntity, GraphSnapshotEntity, RiskFindingEntity, RiskScanRunEntity, AttackPathEntity, EnterpriseIdentityEntity, PipelineRunEntity, OperationalMetadataEntity, ImportJobEntity, ImportRowChunkEntity, ImportAuditLogEntity, ImportValidationIssueEntity, GraphVersionEntity]
