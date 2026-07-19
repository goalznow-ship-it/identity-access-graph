import type { MigrationInterface, QueryRunner } from 'typeorm'

export class EnterpriseAttackPathEngine1721726400000 implements MigrationInterface {
  name = 'EnterpriseAttackPathEngine1721726400000'
  async up(queryRunner: QueryRunner) { await queryRunner.query(`CREATE TABLE attack_path_runs (id uuid PRIMARY KEY, status varchar(32) NOT NULL, path_count integer NOT NULL DEFAULT 0, duration_ms integer NULL, payload jsonb NOT NULL DEFAULT '{}', started_at timestamptz NOT NULL, completed_at timestamptz NULL); CREATE INDEX idx_attack_path_runs_started ON attack_path_runs(started_at DESC); CREATE INDEX idx_attack_path_runs_status ON attack_path_runs(status);`) }
  async down(queryRunner: QueryRunner) { await queryRunner.query('DROP TABLE attack_path_runs') }
}
