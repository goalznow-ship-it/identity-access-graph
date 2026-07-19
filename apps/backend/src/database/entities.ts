import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm'

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

export const DATABASE_ENTITIES = [ConnectorEntity, ConnectorSyncRunEntity, ImportSessionEntity, GraphSnapshotEntity, RiskFindingEntity, AttackPathEntity, EnterpriseIdentityEntity, PipelineRunEntity, OperationalMetadataEntity]
