import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth'
import { Neo4jService } from './neo4j.service'
import type { Neo4jHealthResult } from './neo4j.types'

@Public()
@Controller('health/neo4j')
export class Neo4jHealthController {
  constructor(private readonly neo4j: Neo4jService) {}
  @Get()
  async check(): Promise<Neo4jHealthResult> {
    const started = Date.now()
    if (!this.neo4j.isEnabled()) return { status: 'disabled', connectivity: false, database: this.neo4j.config.database, latencyMs: Date.now() - started, timestamp: new Date().toISOString() }
    try {
      const info = await this.neo4j.connect().getServerInfo({ database: this.neo4j.config.database })
      return { status: 'ok', connectivity: true, database: this.neo4j.config.database, serverAgent: info.agent, latencyMs: Date.now() - started, timestamp: new Date().toISOString() }
    } catch {
      return { status: 'error', connectivity: false, database: this.neo4j.config.database, latencyMs: Date.now() - started, timestamp: new Date().toISOString() }
    }
  }
}
