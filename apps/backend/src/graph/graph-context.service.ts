import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Neo4jService } from '../neo4j'
import { OperationalStoreService } from '../database/operational-store.service'
import type { PersistedGraphNode, PersistedGraphRelationship } from './repositories'

export interface GraphContext {
  mode: 'neo4j' | 'imported'
  activeImportId?: string
  graphVersion?: string
  graphSource: string
  nodeCount: number
  relationshipCount: number
  available: boolean
  healthy: boolean
  updatedAt: string
}

export interface GraphSnapshot {
  nodes: PersistedGraphNode[]
  relationships: PersistedGraphRelationship[]
}

@Injectable()
export class GraphContextService implements OnModuleInit {
  private readonly logger = new Logger(GraphContextService.name)
  private memorySnapshot: GraphSnapshot = { nodes: [], relationships: [] }
  private context: GraphContext = { mode: 'imported', graphSource: 'unavailable', nodeCount: 0, relationshipCount: 0, available: false, healthy: false, updatedAt: new Date().toISOString() }

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly store: OperationalStoreService,
  ) {}

  async onModuleInit() {
    await this.refresh()
    if (this.context.mode === 'neo4j') this.logger.log(`Active graph source: Neo4j (${this.context.nodeCount} nodes, ${this.context.relationshipCount} relationships)`)
    else if (this.context.mode === 'imported') this.logger.log(`Active graph source: Imported (${this.context.nodeCount} nodes, ${this.context.relationshipCount} relationships, import: ${this.context.activeImportId ?? 'none'})`)
    else this.logger.warn('No graph source available. Import data or enable Neo4j.')
  }

  async refresh(): Promise<GraphContext> {
    if (this.neo4j.isEnabled()) {
      try {
        const result = await this.neo4j.read('MATCH (n:GraphNode) WHERE n.deletedVersion IS NULL RETURN count(n) AS nodes', {})
        const relResult = await this.neo4j.read('MATCH ()-[r]->() WHERE r.deletedVersion IS NULL RETURN count(r) AS rels', {})
        const nodeCount = Number(result.records[0]?.get('nodes')?.toNumber?.() ?? result.records[0]?.get('nodes') ?? 0)
        const relationshipCount = Number(relResult.records[0]?.get('rels')?.toNumber?.() ?? relResult.records[0]?.get('rels') ?? 0)
        this.context = { mode: 'neo4j', graphSource: 'neo4j', nodeCount, relationshipCount, available: true, healthy: true, updatedAt: new Date().toISOString() }
        return this.context
      } catch (error) {
        this.logger.warn(`Neo4j is enabled but unreachable: ${(error as Error).message}. Falling back to imported graph.`)
      }
    }
    return this.loadImported()
  }

  private async loadImported(): Promise<GraphContext> {
    const row = await this.store.loadGraph('imported')
    if (row?.payload) {
      const snapshot = row.payload as unknown as GraphSnapshot
      this.memorySnapshot = snapshot
      const importRow = await this.store.getMetadata('active_import')
      const importValue = importRow?.value as { importId?: string; graphVersion?: string } | undefined
      this.context = {
        mode: 'imported',
        activeImportId: importValue?.importId ?? undefined,
        graphVersion: importValue?.graphVersion ?? undefined,
        graphSource: 'imported',
        nodeCount: snapshot.nodes.length,
        relationshipCount: snapshot.relationships.length,
        available: true,
        healthy: true,
        updatedAt: row.updatedAt.toISOString(),
      }
      return this.context
    }
    this.context = { mode: 'imported', graphSource: 'unavailable', nodeCount: 0, relationshipCount: 0, available: false, healthy: false, updatedAt: new Date().toISOString() }
    return this.context
  }

  getContext(): GraphContext {
    return { ...this.context }
  }

  isAvailable(): boolean {
    return this.context.available
  }

  async getSnapshot(): Promise<GraphSnapshot> {
    if (this.context.mode === 'neo4j' && this.neo4j.isEnabled()) {
      const result = await this.neo4j.read('MATCH (n:GraphNode) WHERE n.deletedVersion IS NULL RETURN n{.*, properties: properties(n)} AS node', {})
      const relResult = await this.neo4j.read('MATCH (s:GraphNode)-[r]->(t:GraphNode) WHERE r.deletedVersion IS NULL AND s.deletedVersion IS NULL AND t.deletedVersion IS NULL RETURN r{.*, source: s.id, target: t.id, relationshipType: type(r), properties: properties(r)} AS rel', {})
      return {
        nodes: result.records.map((r: any) => r.get('node')),
        relationships: relResult.records.map((r: any) => r.get('rel')),
      }
    }
    return this.memorySnapshot
  }

  async setImportedGraph(snapshot: GraphSnapshot, importId?: string) {
    this.memorySnapshot = snapshot
    await this.store.saveGraph('imported', snapshot as unknown as Record<string, unknown>)
    if (importId) await this.store.setMetadataAsync('active_import', { importId, graphVersion: 'base', updatedAt: new Date().toISOString() })
    await this.refresh()
  }

  async getNodeById(id: string): Promise<PersistedGraphNode | null> {
    if (this.context.mode === 'neo4j' && this.neo4j.isEnabled()) {
      const result = await this.neo4j.read('MATCH (n:GraphNode {id: $id}) WHERE n.deletedVersion IS NULL RETURN n{.*, properties: properties(n)} AS node', { id })
      return result.records[0]?.get('node') ?? null
    }
    return this.memorySnapshot.nodes.find(n => n.id === id) ?? null
  }

  async searchNodes(query: string, limit = 50, offset = 0): Promise<PersistedGraphNode[]> {
    if (this.context.mode === 'neo4j' && this.neo4j.isEnabled()) {
      const result = await this.neo4j.read('MATCH (n:GraphNode) WHERE n.deletedVersion IS NULL AND (toLower(n.displayName) CONTAINS toLower($query) OR toLower(coalesce(n.id,"")) CONTAINS toLower($query)) RETURN n{.*, properties: properties(n)} AS node ORDER BY n.displayName SKIP $offset LIMIT $limit', { query, limit, offset })
      return result.records.map((r: any) => r.get('node'))
    }
    const lower = query.toLowerCase()
    return this.memorySnapshot.nodes.filter(n => n.displayName?.toLowerCase().includes(lower) || n.id?.toLowerCase().includes(lower)).slice(offset, offset + limit)
  }

  async getNeighbors(id: string, direction: 'incoming' | 'outgoing' | 'both' = 'both', limit = 100): Promise<{ nodes: PersistedGraphNode[]; relationships: PersistedGraphRelationship[] }> {
    if (this.context.mode === 'neo4j' && this.neo4j.isEnabled()) {
      const pattern = direction === 'incoming' ? '<-[r]-' : direction === 'outgoing' ? '-[r]->' : '-[r]-'
      const result = await this.neo4j.read(`MATCH (n:GraphNode {id: $id})${pattern}(neighbor:GraphNode) WHERE n.deletedVersion IS NULL AND neighbor.deletedVersion IS NULL AND r.deletedVersion IS NULL RETURN neighbor{.*, properties: properties(neighbor)} AS node, r{.*, source: n.id, target: neighbor.id, properties: properties(r)} AS rel LIMIT $limit`, { id, limit })
      return { nodes: result.records.map((r: any) => r.get('node')), relationships: result.records.map((r: any) => r.get('rel')) }
    }
    const rels = this.memorySnapshot.relationships.filter(r => {
      const src = typeof r.source === 'object' ? (r.source as any).id : (r.source as string)
      const tgt = typeof r.target === 'object' ? (r.target as any).id : (r.target as string)
      if (direction === 'incoming') return tgt === id
      if (direction === 'outgoing') return src === id
      return src === id || tgt === id
    }).slice(0, limit)
    const neighborIds = new Set<string>()
    for (const rel of rels) {
      const src = typeof rel.source === 'object' ? (rel.source as any).id : (rel.source as string)
      const tgt = typeof rel.target === 'object' ? (rel.target as any).id : (rel.target as string)
      if (src !== id) neighborIds.add(src)
      if (tgt !== id) neighborIds.add(tgt)
    }
    const nodes = this.memorySnapshot.nodes.filter(n => neighborIds.has(n.id))
    return { nodes, relationships: rels }
  }

  async getSubgraph(ids: string[], depth = 1, limit = 500): Promise<GraphSnapshot> {
    if (this.context.mode === 'neo4j' && this.neo4j.isEnabled()) {
      const result = await this.neo4j.read(`MATCH path=(start:GraphNode)-[*0..${Math.min(5, depth)}]-(neighbor) WHERE start.id IN $ids AND ALL(n IN nodes(path) WHERE n.deletedVersion IS NULL) AND ALL(r IN relationships(path) WHERE r.deletedVersion IS NULL) WITH path LIMIT $limit UNWIND nodes(path) AS n UNWIND relationships(path) AS r RETURN collect(DISTINCT n{.*, properties: properties(n)}) AS nodes, collect(DISTINCT r{.*, source: startNode(r).id, target: endNode(r).id, properties: properties(r)}) AS rels`, { ids, limit })
      const row = result.records[0]
      return { nodes: row?.get('nodes') ?? [], relationships: row?.get('rels') ?? [] }
    }
    const idSet = new Set(ids)
    const related = new Set(ids)
    for (let d = 0; d < depth; d++) {
      for (const rel of this.memorySnapshot.relationships) {
        const src = typeof rel.source === 'object' ? (rel.source as any).id : (rel.source as string)
        const tgt = typeof rel.target === 'object' ? (rel.target as any).id : (rel.target as string)
        if (related.has(src)) related.add(tgt)
        if (related.has(tgt)) related.add(src)
      }
    }
    const nodes = this.memorySnapshot.nodes.filter(n => related.has(n.id)).slice(0, limit)
    const relationships = this.memorySnapshot.relationships.filter(r => {
      const src = typeof r.source === 'object' ? (r.source as any).id : (r.source as string)
      const tgt = typeof r.target === 'object' ? (r.target as any).id : (r.target as string)
      return related.has(src) && related.has(tgt)
    })
    return { nodes, relationships }
  }
}
