import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ImportGraphChunks1721900000000 implements MigrationInterface {
  name = 'ImportGraphChunks1721900000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE import_graph_chunks (
        id bigserial PRIMARY KEY,
        import_id uuid NOT NULL REFERENCES import_sessions(import_id) ON DELETE CASCADE,
        kind varchar(16) NOT NULL CHECK (kind IN ('NODE', 'RELATIONSHIP')),
        chunk_index integer NOT NULL,
        item_start integer NOT NULL,
        item_end integer NOT NULL,
        items jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(import_id, kind, chunk_index)
      );
      CREATE INDEX idx_import_graph_chunks_lookup ON import_graph_chunks(import_id, kind, chunk_index);
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE import_graph_chunks') }
}
