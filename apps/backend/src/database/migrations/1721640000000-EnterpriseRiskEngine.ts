import type { MigrationInterface, QueryRunner } from 'typeorm'

export class EnterpriseRiskEngine1721640000000 implements MigrationInterface {
  name = 'EnterpriseRiskEngine1721640000000'
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE risk_scan_runs (id uuid PRIMARY KEY, status varchar(32) NOT NULL, graph_source varchar(32) NOT NULL, rules_run integer NOT NULL DEFAULT 0, findings_detected integer NOT NULL DEFAULT 0, findings_resolved integer NOT NULL DEFAULT 0, duration_ms integer NULL, payload jsonb NOT NULL DEFAULT '{}', started_at timestamptz NOT NULL, completed_at timestamptz NULL); CREATE INDEX idx_risk_scan_runs_started ON risk_scan_runs(started_at DESC); CREATE INDEX idx_risk_scan_runs_status ON risk_scan_runs(status);`)
  }
  async down(queryRunner: QueryRunner) { await queryRunner.query('DROP TABLE risk_scan_runs') }
}
