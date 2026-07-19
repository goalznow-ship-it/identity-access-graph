import type { MigrationInterface, QueryRunner } from 'typeorm'

export class EnterpriseImportEngine1721467200000 implements MigrationInterface {
  name = 'EnterpriseImportEngine1721467200000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE import_jobs (id uuid PRIMARY KEY, import_id uuid NOT NULL REFERENCES import_sessions(import_id) ON DELETE CASCADE, file_id uuid NOT NULL, status varchar(32) NOT NULL, attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 3, checkpoint jsonb NOT NULL DEFAULT '{}', error text NULL, locked_by varchar(128) NULL, locked_at timestamptz NULL, next_attempt_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz NULL);
      CREATE INDEX idx_import_jobs_status_next ON import_jobs(status, next_attempt_at);
      CREATE INDEX idx_import_jobs_import ON import_jobs(import_id);
      CREATE TABLE import_row_chunks (id bigserial PRIMARY KEY, import_id uuid NOT NULL REFERENCES import_sessions(import_id) ON DELETE CASCADE, file_id uuid NOT NULL, sheet_index integer NOT NULL, chunk_index integer NOT NULL, row_start integer NOT NULL, row_end integer NOT NULL, rows jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(import_id, file_id, sheet_index, chunk_index));
      CREATE INDEX idx_import_chunks_lookup ON import_row_chunks(import_id, file_id, sheet_index, chunk_index);
      CREATE TABLE import_audit_log (id bigserial PRIMARY KEY, import_id uuid NOT NULL REFERENCES import_sessions(import_id) ON DELETE CASCADE, event varchar(64) NOT NULL, actor varchar(128) NOT NULL DEFAULT 'system', details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX idx_import_audit_lookup ON import_audit_log(import_id, created_at DESC);
      CREATE TABLE import_validation_issues (id bigserial PRIMARY KEY, import_id uuid NOT NULL REFERENCES import_sessions(import_id) ON DELETE CASCADE, file_id uuid NOT NULL, sheet_index integer NOT NULL, row integer NOT NULL, severity varchar(32) NOT NULL, code varchar(128) NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX idx_import_issues_lookup ON import_validation_issues(import_id, severity);
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE import_validation_issues, import_audit_log, import_row_chunks, import_jobs')
  }
}
