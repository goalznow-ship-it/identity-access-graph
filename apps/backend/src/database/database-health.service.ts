import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check() {
    const started = Date.now()
    try {
      await this.dataSource.query('SELECT 1')
      return { status: 'ok' as const, database: 'postgresql', latencyMs: Date.now() - started }
    } catch (error) {
      return { status: 'error' as const, database: 'postgresql', latencyMs: Date.now() - started, error: (error as Error).message }
    }
  }
}
