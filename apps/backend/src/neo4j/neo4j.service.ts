import { Inject, Injectable, OnApplicationShutdown, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import neo4j, { type Driver, type RecordShape, type SessionMode } from 'neo4j-driver'
import type { DriverFactory, Neo4jConfig, Neo4jQueryResult, QueryParameters, TransactionWork } from './neo4j.types'
import { Neo4jQueryError, Neo4jUnavailableError } from './neo4j.types'

export const NEO4J_DRIVER_FACTORY = 'NEO4J_DRIVER_FACTORY'
export function resolveNeo4jConfig(env: Record<string, string | undefined>): Neo4jConfig {
  const enabled = (env.NEO4J_ENABLED ?? 'false').toLowerCase() === 'true'
  const config: Neo4jConfig = { enabled, uri: env.NEO4J_URI, username: env.NEO4J_USERNAME, password: env.NEO4J_PASSWORD, database: env.NEO4J_DATABASE || 'neo4j', encrypted: (env.NEO4J_ENCRYPTED ?? 'true').toLowerCase() !== 'false', queryTimeoutMs: Number(env.NEO4J_QUERY_TIMEOUT_MS || 30000) }
  if (enabled) { for (const [key, value] of [['NEO4J_URI', config.uri], ['NEO4J_USERNAME', config.username], ['NEO4J_PASSWORD', config.password]]) if (!value) throw new Error(`${key} is required when NEO4J_ENABLED=true`); if (!Number.isFinite(config.queryTimeoutMs) || config.queryTimeoutMs <= 0) throw new Error('NEO4J_QUERY_TIMEOUT_MS must be a positive number') }
  return config
}
export function sanitizeParameters(parameters: QueryParameters): QueryParameters {
  const clean = (value: unknown): unknown => { if (value === undefined || typeof value === 'function' || typeof value === 'symbol') throw new Neo4jQueryError('Query parameters contain an unsupported value'); if (value === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof value)) return value; if (value instanceof Date) return value.toISOString(); if (Array.isArray(value)) return value.map(clean); if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, clean(item)])); throw new Neo4jQueryError('Query parameters contain an unsupported object') }
  return clean(parameters) as QueryParameters
}
@Injectable()
export class Neo4jService implements OnApplicationShutdown {
  private driver?: Driver
  readonly config: Neo4jConfig
  constructor(configService: ConfigService, @Optional() @Inject(NEO4J_DRIVER_FACTORY) private readonly factory?: DriverFactory) { this.config = resolveNeo4jConfig({ NEO4J_ENABLED: configService.get('NEO4J_ENABLED'), NEO4J_URI: configService.get('NEO4J_URI'), NEO4J_USERNAME: configService.get('NEO4J_USERNAME'), NEO4J_PASSWORD: configService.get('NEO4J_PASSWORD'), NEO4J_DATABASE: configService.get('NEO4J_DATABASE'), NEO4J_ENCRYPTED: configService.get('NEO4J_ENCRYPTED'), NEO4J_QUERY_TIMEOUT_MS: configService.get('NEO4J_QUERY_TIMEOUT_MS') }) }
  isEnabled() { return this.config.enabled }
  connect(): Driver { if (!this.config.enabled) throw new Neo4jUnavailableError('Neo4j is disabled'); if (!this.driver) this.driver = this.factory ? this.factory(this.config) : neo4j.driver(this.config.uri!, neo4j.auth.basic(this.config.username!, this.config.password!), { encrypted: this.config.encrypted ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF' }); return this.driver }
  async close() { if (this.driver) { await this.driver.close(); this.driver = undefined } }
  async onApplicationShutdown() { await this.close() }
  async verifyConnectivity() { if (!this.config.enabled) return false; try { await this.connect().verifyConnectivity({ database: this.config.database }); return true } catch { return false } }
  private mapError(error: unknown) { if (error instanceof Neo4jUnavailableError || error instanceof Neo4jQueryError) return error; const candidate = error as { code?: string }; return new Neo4jQueryError(candidate.code?.startsWith('Neo.TransientError') ? 'Neo4j operation temporarily unavailable' : 'Neo4j operation failed', candidate.code) }
  async executeQuery<R extends RecordShape = RecordShape>(cypher: string, parameters: QueryParameters = {}, mode: SessionMode = neo4j.session.READ): Promise<Neo4jQueryResult<R>> { if (!cypher.trim()) throw new Neo4jQueryError('Cypher query is required'); const session = this.connect().session({ database: this.config.database, defaultAccessMode: mode }); try { return await session.run<R>(cypher, sanitizeParameters(parameters), { timeout: this.config.queryTimeoutMs }) } catch (error) { throw this.mapError(error) } finally { await session.close() } }
  read<R extends RecordShape = RecordShape>(cypher: string, parameters: QueryParameters = {}) { return this.executeQuery<R>(cypher, parameters, neo4j.session.READ) }
  write<R extends RecordShape = RecordShape>(cypher: string, parameters: QueryParameters = {}) { return this.executeQuery<R>(cypher, parameters, neo4j.session.WRITE) }
  async runInTransaction<T>(mode: SessionMode, work: TransactionWork<T>): Promise<T> { const session = this.connect().session({ database: this.config.database, defaultAccessMode: mode }); try { const runner = mode === neo4j.session.READ ? session.executeRead.bind(session) : session.executeWrite.bind(session); return await runner(async (transaction) => work(transaction), { timeout: this.config.queryTimeoutMs }) } catch (error) { throw this.mapError(error) } finally { await session.close() } }
}
