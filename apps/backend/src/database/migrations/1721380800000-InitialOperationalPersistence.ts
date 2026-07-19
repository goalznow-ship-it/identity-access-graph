import type { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialOperationalPersistence1721380800000 implements MigrationInterface {
  name = 'InitialOperationalPersistence1721380800000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE connectors (id uuid PRIMARY KEY, name varchar(255) NOT NULL, connector_type varchar(64) NOT NULL, status varchar(32) NOT NULL, enabled boolean NOT NULL DEFAULT false, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX idx_connectors_type ON connectors(connector_type); CREATE INDEX idx_connectors_status ON connectors(status);
      CREATE TABLE connector_sync_runs (sync_run_id uuid PRIMARY KEY, connector_id uuid NOT NULL REFERENCES connectors(id) ON DELETE CASCADE, status varchar(32) NOT NULL, mode varchar(32) NOT NULL, payload jsonb NOT NULL, started_at timestamptz NOT NULL, completed_at timestamptz NULL);
      CREATE INDEX idx_connector_runs_connector_started ON connector_sync_runs(connector_id, started_at DESC); CREATE INDEX idx_connector_runs_status ON connector_sync_runs(status);
      CREATE TABLE import_sessions (import_id uuid PRIMARY KEY, status varchar(32) NOT NULL, cancelled boolean NOT NULL DEFAULT false, payload jsonb NOT NULL, created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX idx_import_sessions_status ON import_sessions(status); CREATE INDEX idx_import_sessions_expires ON import_sessions(expires_at);
      CREATE TABLE graph_snapshots (id varchar(128) PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE risk_findings (id varchar(128) PRIMARY KEY, rule_id varchar(128) NOT NULL, severity varchar(32) NOT NULL, category varchar(64) NOT NULL, status varchar(32) NOT NULL, score integer NOT NULL, payload jsonb NOT NULL, first_detected timestamptz NOT NULL, last_detected timestamptz NOT NULL);
      CREATE INDEX idx_risk_rule ON risk_findings(rule_id); CREATE INDEX idx_risk_severity ON risk_findings(severity); CREATE INDEX idx_risk_category ON risk_findings(category); CREATE INDEX idx_risk_status ON risk_findings(status);
      CREATE TABLE attack_paths (id varchar(128) PRIMARY KEY, risk_score integer NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL); CREATE INDEX idx_attack_paths_score ON attack_paths(risk_score DESC);
      CREATE TABLE enterprise_identities (id varchar(128) PRIMARY KEY, canonical_identity_id varchar(128) NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL); CREATE INDEX idx_enterprise_identity_canonical ON enterprise_identities(canonical_identity_id);
      CREATE TABLE pipeline_runs (id uuid PRIMARY KEY, status varchar(32) NOT NULL, payload jsonb NOT NULL, started_at timestamptz NULL, completed_at timestamptz NULL, updated_at timestamptz NOT NULL DEFAULT now()); CREATE INDEX idx_pipeline_status ON pipeline_runs(status);
      CREATE TABLE operational_metadata (key varchar(128) PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE operational_metadata, pipeline_runs, enterprise_identities, attack_paths, risk_findings, graph_snapshots, import_sessions, connector_sync_runs, connectors')
  }
}
