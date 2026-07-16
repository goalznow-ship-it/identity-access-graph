import type { Driver, ManagedTransaction, QueryResult, RecordShape, Result } from 'neo4j-driver'
export interface Neo4jConfig { enabled: boolean; uri?: string; username?: string; password?: string; database: string; encrypted: boolean; queryTimeoutMs: number }
export type QueryParameters = Record<string, unknown>
export type DriverFactory = (config: Neo4jConfig) => Driver
export interface Neo4jHealthResult { status: 'ok'|'error'|'disabled'; connectivity: boolean; database: string; serverAgent?: string; latencyMs: number; timestamp: string }
export class Neo4jUnavailableError extends Error { constructor(message = 'Neo4j is unavailable') { super(message); this.name = 'Neo4jUnavailableError' } }
export class Neo4jQueryError extends Error { readonly code?: string; constructor(message: string, code?: string) { super(message); this.name = 'Neo4jQueryError'; this.code = code } }
export type Neo4jQueryResult<R extends RecordShape = RecordShape> = QueryResult<R>|Result<R>
export type TransactionWork<T> = (transaction: ManagedTransaction) => Promise<T>
