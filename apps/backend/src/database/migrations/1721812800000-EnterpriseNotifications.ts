import type { MigrationInterface, QueryRunner } from 'typeorm'
export class EnterpriseNotifications1721812800000 implements MigrationInterface {
  name='EnterpriseNotifications1721812800000'
  async up(queryRunner:QueryRunner){await queryRunner.query(`CREATE TABLE notifications (id uuid PRIMARY KEY, type varchar(32) NOT NULL, severity varchar(32) NOT NULL, is_read boolean NOT NULL DEFAULT false, title varchar(255) NOT NULL, message text NOT NULL, link varchar(512) NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz NULL); CREATE INDEX idx_notifications_created ON notifications(created_at DESC); CREATE INDEX idx_notifications_unread ON notifications(is_read, created_at DESC); CREATE INDEX idx_notifications_type ON notifications(type); CREATE INDEX idx_notifications_severity ON notifications(severity);`)}
  async down(queryRunner:QueryRunner){await queryRunner.query('DROP TABLE notifications')}
}
