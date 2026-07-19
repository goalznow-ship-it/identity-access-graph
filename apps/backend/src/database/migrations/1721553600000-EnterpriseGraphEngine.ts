import type { MigrationInterface, QueryRunner } from 'typeorm'

export class EnterpriseGraphEngine1721553600000 implements MigrationInterface {
  name = 'EnterpriseGraphEngine1721553600000'
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE SEQUENCE graph_version_sequence START 1; CREATE TABLE graph_versions (id uuid PRIMARY KEY, sequence bigint NOT NULL UNIQUE DEFAULT nextval('graph_version_sequence'), status varchar(32) NOT NULL, source varchar(128) NOT NULL, description text NULL, parent_version_id uuid NULL REFERENCES graph_versions(id), nodes_added integer NOT NULL DEFAULT 0, nodes_updated integer NOT NULL DEFAULT 0, nodes_deleted integer NOT NULL DEFAULT 0, relationships_added integer NOT NULL DEFAULT 0, relationships_updated integer NOT NULL DEFAULT 0, relationships_deleted integer NOT NULL DEFAULT 0, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz NULL); CREATE INDEX idx_graph_versions_created ON graph_versions(created_at DESC); CREATE INDEX idx_graph_versions_status ON graph_versions(status);`)
  }
  async down(queryRunner: QueryRunner) { await queryRunner.query('DROP TABLE graph_versions; DROP SEQUENCE graph_version_sequence') }
}
