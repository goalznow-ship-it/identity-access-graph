import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { GraphSnapshotEntity, GraphVersionEntity } from '../database/entities'
import { Neo4jService } from '../neo4j'
import type { PersistedGraphNode, PersistedGraphRelationship } from './repositories'
import neo4j, { type ManagedTransaction } from 'neo4j-driver'

interface IncrementalUpdate { source: string; description?: string; metadata?: Record<string, unknown>; nodes?: PersistedGraphNode[]; relationships?: PersistedGraphRelationship[]; deleteNodeIds?: string[]; deleteRelationshipIds?: string[] }
const NEO4J_WRITE_BATCH_SIZE = 1000
const item = (record: any, key: string) => { const value = record?.get?.(key); return value?.toNumber?.() ?? value }

@Injectable()
export class EnterpriseGraphService {
  constructor(private readonly neo4j: Neo4jService, @InjectRepository(GraphVersionEntity) private readonly versions: Repository<GraphVersionEntity>, @InjectRepository(GraphSnapshotEntity) private readonly snapshots: Repository<GraphSnapshotEntity>) {}

  async apply(update: IncrementalUpdate) {
    return this.applySources(update, chunks(update.nodes ?? [], NEO4J_WRITE_BATCH_SIZE), chunks(update.relationships ?? [], NEO4J_WRITE_BATCH_SIZE))
  }

  async applyChunks(update: Omit<IncrementalUpdate, 'nodes' | 'relationships'>, nodeChunks: AsyncIterable<PersistedGraphNode[]>, relationshipChunks: AsyncIterable<PersistedGraphRelationship[]>) {
    return this.applySources(update, nodeChunks, relationshipChunks)
  }

  private async applySources(update: Omit<IncrementalUpdate, 'nodes' | 'relationships'>, nodeChunks: AsyncIterable<PersistedGraphNode[]> | Iterable<PersistedGraphNode[]>, relationshipChunks: AsyncIterable<PersistedGraphRelationship[]> | Iterable<PersistedGraphRelationship[]>) {
    const parent = await this.latestVersion(), id = randomUUID()
    await this.versions.save({ id, status: 'APPLYING', source: update.source, description: update.description ?? null, parentVersionId: parent?.id ?? null, metadata: update.metadata ?? {}, completedAt: null } as any)
    const version = await this.versions.findOneByOrFail({ id })
    try {
      const counts = await this.neo4j.runInTransaction(neo4j.session.WRITE, async (transaction) => this.writeVersion(transaction, String(version.sequence), nodeChunks, relationshipChunks, update.deleteNodeIds ?? [], update.deleteRelationshipIds ?? []))
      await this.versions.update(id, { ...counts, status: 'COMPLETED', completedAt: new Date() })
      return { ...(await this.versions.findOneByOrFail({ id })), counts }
    } catch (error) { await this.versions.update(id, { status: 'FAILED', completedAt: new Date(), metadata: { ...update.metadata, error: (error as Error).message } } as any); throw error }
  }

  private async writeVersion(transaction: ManagedTransaction, version: string, nodeChunks: AsyncIterable<PersistedGraphNode[]> | Iterable<PersistedGraphNode[]>, relationshipChunks: AsyncIterable<PersistedGraphRelationship[]> | Iterable<PersistedGraphRelationship[]>, deleteNodeIds: string[], deleteRelationshipIds: string[]) {
    let nodesAdded = 0, nodesUpdated = 0, relationshipsAdded = 0, relationshipsUpdated = 0
    for await (const sourceChunk of nodeChunks) for (const batch of chunks(sourceChunk.filter((node) => node.id), NEO4J_WRITE_BATCH_SIZE)) {
      const result = await transaction.run(`UNWIND $rows AS row OPTIONAL MATCH (existing:GraphNode {id: row.id}) WITH row, existing IS NULL AS created MERGE (n:GraphNode {id: row.id}) SET n += row.properties, n.graphVersion=$version, n.deletedVersion=null RETURN sum(CASE WHEN created THEN 1 ELSE 0 END) AS added, sum(CASE WHEN created THEN 0 ELSE 1 END) AS updated`, { rows: batch.map((node) => ({ id: node.id, properties: clean({ ...node.properties, id: node.id, displayName: node.displayName, nodeType: node.nodeType, sourceSystem: node.sourceSystem, sourceId: node.sourceId, riskLevel: node.riskLevel ?? 'NONE' }) })), version })
      nodesAdded += Number(item(result.records[0], 'added') ?? 0); nodesUpdated += Number(item(result.records[0], 'updated') ?? 0)
    }
    for await (const sourceChunk of relationshipChunks) for (const [type, rows] of groupRelationships(sourceChunk.filter((relationship) => relationship.id))) for (const batch of chunks(rows, NEO4J_WRITE_BATCH_SIZE)) {
      const result = await transaction.run(`UNWIND $rows AS row MATCH (s:GraphNode {id: row.source}), (t:GraphNode {id: row.target}) OPTIONAL MATCH (s)-[existing:${type} {id: row.id}]->(t) WITH row,s,t,existing IS NULL AS created MERGE (s)-[r:${type} {id: row.id}]->(t) SET r += row.properties, r.graphVersion=$version, r.deletedVersion=null RETURN sum(CASE WHEN created THEN 1 ELSE 0 END) AS added, sum(CASE WHEN created THEN 0 ELSE 1 END) AS updated`, { rows: batch, version })
      relationshipsAdded += Number(item(result.records[0], 'added') ?? 0); relationshipsUpdated += Number(item(result.records[0], 'updated') ?? 0)
    }
    const nodesDeleted = await this.markDeletedNodes(deleteNodeIds, version, transaction), relationshipsDeleted = await this.markDeletedRelationships(deleteRelationshipIds, version, transaction)
    return { nodesAdded, nodesUpdated, nodesDeleted, relationshipsAdded, relationshipsUpdated, relationshipsDeleted }
  }

  latestVersion() { return this.versions.findOne({ where: { status: 'COMPLETED' }, order: { sequence: 'DESC' } }) }
  listVersions(limit = 50) { return this.versions.find({ order: { sequence: 'DESC' }, take: Math.min(200, Math.max(1, limit)) }) }

  async createSnapshot(name?: string) {
    const version = await this.latestVersion(); if (!version) throw new NotFoundException('No completed graph version exists')
    const [nodes, relationships] = await Promise.all([this.neo4j.read('MATCH (n:GraphNode) WHERE n.deletedVersion IS NULL RETURN n{.*, properties: properties(n)} AS value'), this.neo4j.read('MATCH (s:GraphNode)-[r]->(t:GraphNode) WHERE r.deletedVersion IS NULL RETURN r{.*, source:s.id, target:t.id, relationshipType:type(r), properties:properties(r)} AS value')])
    const id = randomUUID(), payload = { versionId: version.id, sequence: version.sequence, name: name ?? `Snapshot ${version.sequence}`, nodes: nodes.records.map((row: any) => row.get('value')), relationships: relationships.records.map((row: any) => row.get('value')) }
    await this.snapshots.save({ id, payload }); return { id, versionId: version.id, sequence: version.sequence, name: payload.name, nodeCount: payload.nodes.length, relationshipCount: payload.relationships.length }
  }
  listSnapshots() { return this.snapshots.find({ order: { updatedAt: 'DESC' } }).then((rows) => rows.filter((row) => (row.payload as any).versionId).map((row) => ({ id: row.id, updatedAt: row.updatedAt, versionId: (row.payload as any).versionId, sequence: (row.payload as any).sequence, name: (row.payload as any).name, nodeCount: (row.payload as any).nodes?.length ?? 0, relationshipCount: (row.payload as any).relationships?.length ?? 0 }))) }
  async diff(fromId: string, toId: string) { const [from, to] = await Promise.all([this.snapshots.findOneBy({ id: fromId }), this.snapshots.findOneBy({ id: toId })]); if (!from || !to) throw new NotFoundException('Graph snapshot not found'); return diffPayload(from.payload as any, to.payload as any) }
  async shortestPath(source: string, target: string, maxDepth = 8) { const depth = Math.min(15, Math.max(1, Math.trunc(maxDepth))); const result = await this.neo4j.read(`MATCH path=shortestPath((s:GraphNode {id:$source})-[*..${depth}]->(t:GraphNode {id:$target})) WHERE ALL(n IN nodes(path) WHERE n.deletedVersion IS NULL) RETURN [n IN nodes(path)|n{.*,properties:properties(n)}] AS nodes,[r IN relationships(path)|r{.*,source:startNode(r).id,target:endNode(r).id,relationshipType:type(r),properties:properties(r)}] AS relationships,length(path) AS depth`, { source, target }); return result.records[0] ? { nodes: item(result.records[0], 'nodes'), relationships: item(result.records[0], 'relationships'), depth: Number(item(result.records[0], 'depth')) } : null }
  async blastRadius(source: string, maxDepth = 4) { const depth = Math.min(10, Math.max(1, Math.trunc(maxDepth))); const result = await this.neo4j.read(`MATCH path=(s:GraphNode {id:$source})-[*1..${depth}]->(n:GraphNode) WHERE ALL(x IN nodes(path) WHERE x.deletedVersion IS NULL) WITH DISTINCT n, min(length(path)) AS depth RETURN collect(n{.*,depth:depth,properties:properties(n)}) AS nodes,count(n) AS affected`, { source }); const nodes = (result.records[0] ? item(result.records[0], 'nodes') : []) as any[]; return { source, maxDepth: depth, affected: Number(result.records[0] ? item(result.records[0], 'affected') : 0), nodes: nodes.map((node) => ({ ...node, depth: Number(node.depth?.toNumber?.() ?? node.depth) })) } }
  async statistics() { const result = await this.neo4j.read(`MATCH (n:GraphNode) WHERE n.deletedVersion IS NULL OPTIONAL MATCH (n)-[r]->() WHERE r.deletedVersion IS NULL RETURN count(DISTINCT n) AS nodes,count(DISTINCT r) AS relationships,collect(DISTINCT n.nodeType) AS nodeTypes,collect(DISTINCT type(r)) AS relationshipTypes`); const latest = await this.latestVersion(); return { nodeCount: Number(item(result.records[0], 'nodes') ?? 0), relationshipCount: Number(item(result.records[0], 'relationships') ?? 0), nodeTypes: item(result.records[0], 'nodeTypes') ?? [], relationshipTypes: item(result.records[0], 'relationshipTypes') ?? [], latestVersion: latest, database: this.neo4j.config.database, timestamp: new Date().toISOString() } }
  private async markDeletedNodes(ids: string[], version: string, transaction?: ManagedTransaction) { if (!ids.length) return 0; const result = transaction ? await transaction.run('MATCH (n:GraphNode) WHERE n.id IN $ids AND n.deletedVersion IS NULL SET n.deletedVersion=$version RETURN count(n) AS count', { ids, version }) : await this.neo4j.write('MATCH (n:GraphNode) WHERE n.id IN $ids AND n.deletedVersion IS NULL SET n.deletedVersion=$version RETURN count(n) AS count', { ids, version }); return Number(item(result.records[0], 'count') ?? 0) }
  private async markDeletedRelationships(ids: string[], version: string, transaction?: ManagedTransaction) { if (!ids.length) return 0; const result = transaction ? await transaction.run('MATCH ()-[r]->() WHERE r.id IN $ids AND r.deletedVersion IS NULL SET r.deletedVersion=$version RETURN count(r) AS count', { ids, version }) : await this.neo4j.write('MATCH ()-[r]->() WHERE r.id IN $ids AND r.deletedVersion IS NULL SET r.deletedVersion=$version RETURN count(r) AS count', { ids, version }); return Number(item(result.records[0], 'count') ?? 0) }
}

function clean(value: Record<string, unknown>) { return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v && typeof v === 'object' ? JSON.stringify(v) : v])) }
function chunks<T>(values: T[], size: number): T[][] { const result: T[][] = []; for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size)); return result }
function groupRelationships(values: PersistedGraphRelationship[]) { const groups = new Map<string, any[]>(); for (const rel of values) { if (!/^[A-Z][A-Z0-9_]*$/.test(rel.relationshipType)) throw new Error('Invalid relationship type'); groups.set(rel.relationshipType, [...(groups.get(rel.relationshipType) ?? []), { id: rel.id, source: rel.source, target: rel.target, properties: clean({ ...rel.properties, id: rel.id, sourceSystem: rel.sourceSystem, relationshipType: rel.relationshipType }) }]) } return groups }
function diffPayload(from: any, to: any) { const compare = (before: any[], after: any[]) => { const a = new Map(before.map((x) => [x.id, x])), b = new Map(after.map((x) => [x.id, x])); return { added: [...b.keys()].filter((id) => !a.has(id)), removed: [...a.keys()].filter((id) => !b.has(id)), updated: [...b.keys()].filter((id) => a.has(id) && JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id))) } }; return { from: { id: from.versionId, sequence: from.sequence }, to: { id: to.versionId, sequence: to.sequence }, nodes: compare(from.nodes ?? [], to.nodes ?? []), relationships: compare(from.relationships ?? [], to.relationships ?? []) } }
