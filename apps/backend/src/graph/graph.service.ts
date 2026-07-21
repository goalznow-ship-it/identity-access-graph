import { Inject, Injectable, Optional } from '@nestjs/common'
import { Neo4jService } from '../neo4j'
import { GRAPH_REPOSITORY, GraphRepository } from './repositories'
import type { NeighborOptions, PersistedGraphNode, PersistedGraphRelationship, SearchOptions, SubgraphOptions } from './repositories'
import { EnterpriseGraphService } from './enterprise-graph.service'
import { GraphContextService } from './graph-context.service'
export interface GraphReadFilters { nodeType?: string; sourceSystem?: string; risk?: string; status?: string; limit?: number; relationshipLimit?: number }
export interface ExplorerQuery { query?:string;nodeTypes?:string[];sourceSystems?:string[];riskLevels?:string[];statuses?:string[];limit?:number;offset?:number;sortBy?:'displayName'|'nodeType'|'sourceSystem'|'riskLevel'|'status';sortDirection?:'ASC'|'DESC' }
const filterCypher = 'n.deletedVersion IS NULL AND ($nodeType IS NULL OR n.nodeType = $nodeType) AND ($sourceSystem IS NULL OR n.sourceSystem = $sourceSystem) AND ($risk IS NULL OR n.riskLevel = $risk) AND ($status IS NULL OR n.status = $status)'
function value(record: any, key: string) { const item = record.get(key); return item?.toNumber?.() ?? item }
function list(value?: string) { return value?.split(',').map(item => item.trim()).filter(Boolean) ?? [] }

@Injectable()
export class GraphService {
  constructor(
    @Inject(GRAPH_REPOSITORY) private readonly repository: GraphRepository,
    private readonly neo4j: Neo4jService,
    @Optional() private readonly enterprise?: EnterpriseGraphService,
    @Optional() private readonly context?: GraphContextService,
  ) {}
  isPersistenceEnabled() { return this.neo4j.isEnabled() }

  private usingNeo4j(): boolean {
    if (!this.neo4j.isEnabled()) return false
    if (this.context) return this.context.getContext().mode === 'neo4j'
    return true
  }

  async getNodeById(id: string) {
    if (this.usingNeo4j()) return this.repository.getNodeById(id)
    return this.context?.getNodeById(id) ?? null
  }
  async getNeighbors(id: string, options?: NeighborOptions, depth = 1) {
    if (this.usingNeo4j()) return depth > 1 ? this.repository.getSubgraph([id], { depth: Math.min(Math.max(Math.trunc(depth), 1), 3), limit: options?.limit }) : this.repository.getNeighbors(id, options)
    return this.context?.getNeighbors(id, options?.direction ?? 'both', options?.limit ?? 100) ?? { nodes: [], relationships: [] }
  }
  async searchNodes(query: string, searchOptions?: SearchOptions) {
    if (this.usingNeo4j()) return this.repository.searchNodes(query, searchOptions)
    return this.context?.searchNodes(query, searchOptions?.limit ?? 50, searchOptions?.offset ?? 0) ?? []
  }
  async exploreNodes(input: ExplorerQuery = {}) {
    if (this.usingNeo4j()) {
      const limit = Math.min(500, Math.max(1, Math.trunc(input.limit ?? 25))), offset = Math.max(0, Math.trunc(input.offset ?? 0))
      const sortBy = input.sortBy ?? 'displayName', sortDirection = input.sortDirection === 'DESC' ? 'DESC' : 'ASC'
      const properties = { displayName: 'n.displayName', nodeType: 'n.nodeType', sourceSystem: 'n.sourceSystem', riskLevel: 'n.riskLevel', status: 'n.status' } as const
      const order = properties[sortBy]
      const parameters = { query: input.query?.trim() ?? '', nodeTypes: input.nodeTypes ?? [], sourceSystems: input.sourceSystems ?? [], riskLevels: input.riskLevels ?? [], statuses: input.statuses ?? [], limit, offset }
      const where = `n.deletedVersion IS NULL AND ($query='' OR toLower(n.displayName) CONTAINS toLower($query) OR toLower(coalesce(n.username,'')) CONTAINS toLower($query) OR toLower(coalesce(n.email,'')) CONTAINS toLower($query) OR toLower(n.id) CONTAINS toLower($query)) AND (size($nodeTypes)=0 OR n.nodeType IN $nodeTypes) AND (size($sourceSystems)=0 OR n.sourceSystem IN $sourceSystems) AND (size($riskLevels)=0 OR n.riskLevel IN $riskLevels) AND (size($statuses)=0 OR n.status IN $statuses)`
      const result = await this.neo4j.read(`MATCH (n:GraphNode) WHERE ${where} WITH n ORDER BY ${order} ${sortDirection}, n.id ASC WITH collect(n{.*, properties: properties(n)}) AS allNodes, count(n) AS total RETURN allNodes[$offset..$offset+$limit] AS nodes, total`, parameters)
      const row = result.records[0]
      const nodes = (row?.get('nodes') ?? []) as PersistedGraphNode[], total = Number(value(row, 'total') ?? 0)
      return { items: nodes, total, limit, offset, hasMore: offset + nodes.length < total, sortBy, sortDirection }
    }
    if (!this.context) return { items: [], total: 0, limit: 25, offset: 0, hasMore: false, sortBy: 'displayName', sortDirection: 'ASC' }
    const snapshot = await this.context.getSnapshot()
    let nodes = snapshot.nodes
    if (input.query) { const q = input.query.toLowerCase(); nodes = nodes.filter(n => (n.displayName?.toLowerCase().includes(q) || n.id?.toLowerCase().includes(q))) }
    if (input.nodeTypes?.length) nodes = nodes.filter(n => input.nodeTypes!.includes(n.nodeType))
    if (input.sourceSystems?.length) nodes = nodes.filter(n => input.sourceSystems!.includes(n.sourceSystem))
    if (input.riskLevels?.length) nodes = nodes.filter(n => input.riskLevels!.includes(n.riskLevel ?? 'NONE'))
    if (input.statuses?.length) nodes = nodes.filter(n => input.statuses!.includes(n.properties?.status as string ?? 'active'))
    const sortBy = input.sortBy ?? 'displayName', sortDir = input.sortDirection === 'DESC' ? -1 : 1
    nodes = [...nodes].sort((a, b) => {
      const aVal = String(a[sortBy as keyof PersistedGraphNode] ?? ''), bVal = String(b[sortBy as keyof PersistedGraphNode] ?? '')
      return aVal.localeCompare(bVal) * sortDir
    })
    const total = nodes.length, offset = Math.max(0, Math.trunc(input.offset ?? 0)), limit = Math.min(500, Math.max(1, Math.trunc(input.limit ?? 25)))
    const items = nodes.slice(offset, offset + limit)
    return { items, total, limit, offset, hasMore: offset + items.length < total, sortBy, sortDirection: input.sortDirection ?? 'ASC' }
  }
  async exploreRelationships(input: { query?: string; types?: string[]; sourceSystems?: string[]; limit?: number; offset?: number; sortDirection?: 'ASC' | 'DESC' } = {}) {
    if (this.usingNeo4j()) {
      const limit = Math.min(500, Math.max(1, Math.trunc(input.limit ?? 25))), offset = Math.max(0, Math.trunc(input.offset ?? 0)), sortDirection = input.sortDirection === 'ASC' ? 'ASC' : 'DESC'
      const parameters = { query: input.query?.trim() ?? '', types: input.types ?? [], sourceSystems: input.sourceSystems ?? [], limit, offset }
      const result = await this.neo4j.read(`MATCH (source:GraphNode)-[r]->(target:GraphNode) WHERE r.deletedVersion IS NULL AND source.deletedVersion IS NULL AND target.deletedVersion IS NULL AND ($query='' OR toLower(source.displayName) CONTAINS toLower($query) OR toLower(target.displayName) CONTAINS toLower($query) OR toLower(type(r)) CONTAINS toLower($query)) AND (size($types)=0 OR type(r) IN $types) AND (size($sourceSystems)=0 OR r.sourceSystem IN $sourceSystems) WITH source,r,target ORDER BY coalesce(r.updatedAt,r.createdAt,'') ${sortDirection}, r.id ASC WITH collect({relationship:r{.*,source:source.id,target:target.id,relationshipType:type(r),properties:properties(r)},sourceName:source.displayName,targetName:target.displayName}) AS allItems,count(r) AS total RETURN allItems[$offset..$offset+$limit] AS items,total`, parameters)
      const row = result.records[0], items = row?.get('items') ?? [], total = Number(value(row, 'total') ?? 0)
      return { items, total, limit, offset, hasMore: offset + items.length < total }
    }
    if (!this.context) return { items: [], total: 0, limit: 25, offset: 0, hasMore: false }
    const snapshot = await this.context.getSnapshot()
    let rels = snapshot.relationships.map(r => ({
      relationship: r,
      sourceName: snapshot.nodes.find(n => n.id === (typeof r.source === 'object' ? (r.source as any).id : r.source))?.displayName ?? '',
      targetName: snapshot.nodes.find(n => n.id === (typeof r.target === 'object' ? (r.target as any).id : r.target))?.displayName ?? '',
    }))
    if (input.query) { const q = input.query.toLowerCase(); rels = rels.filter(r => r.sourceName.toLowerCase().includes(q) || r.targetName.toLowerCase().includes(q) || r.relationship.relationshipType?.toLowerCase().includes(q)) }
    if (input.types?.length) rels = rels.filter(r => input.types!.includes(r.relationship.relationshipType))
    const total = rels.length, offset = Math.max(0, Math.trunc(input.offset ?? 0)), limit = Math.min(500, Math.max(1, Math.trunc(input.limit ?? 25)))
    const items = rels.slice(offset, offset + limit)
    return { items, total, limit, offset, hasMore: offset + items.length < total }
  }
  async exportNodes(input: ExplorerQuery = {}) {
    const items: PersistedGraphNode[] = []; let total = 0
    do { const page = await this.exploreNodes({ ...input, offset: items.length, limit: 500 }); items.push(...page.items); total = page.total; if (!page.items.length) break } while (items.length < total && items.length < 50000)
    return { items, total, truncated: items.length < total }
  }
  async exportRelationships(input: { query?: string; types?: string[]; sourceSystems?: string[]; sortDirection?: 'ASC' | 'DESC' } = {}) {
    const items: any[] = []; let total = 0
    do { const page = await this.exploreRelationships({ ...input, offset: items.length, limit: 500 }); items.push(...page.items); total = page.total; if (!page.items.length) break } while (items.length < total && items.length < 50000)
    return { items, total, truncated: items.length < total }
  }
  async getSubgraph(ids: string[], options: SubgraphOptions = {}, filters: GraphReadFilters = {}) {
    if (this.usingNeo4j()) {
      if (ids.length) return this.repository.getSubgraph(ids, options)
      const limit = Number.isFinite(filters.limit) ? Math.min(Math.max(Math.trunc(filters.limit!), 1), 10000) : 300
      const relationshipLimit = Number.isFinite(filters.relationshipLimit) ? Math.min(Math.max(Math.trunc(filters.relationshipLimit!), 0), 50000) : 1200
      const parameters = { nodeType: filters.nodeType ?? null, sourceSystem: filters.sourceSystem ?? null, risk: filters.risk ?? null, status: filters.status ?? null, limit }
      const nodeResult = await this.neo4j.read(`MATCH (n:GraphNode) WHERE ${filterCypher} RETURN n{.*, properties: properties(n)} AS node ORDER BY n.displayName LIMIT $limit`, parameters)
      const nodes = nodeResult.records.map((record: any) => record.get('node')) as PersistedGraphNode[]
      const nodeIds = nodes.map((node) => node.id)
      if (!nodeIds.length) return { nodes: [], relationships: [], partial: false }
      const relationshipResult = await this.neo4j.read('MATCH (source:GraphNode)-[r]->(target:GraphNode) WHERE source.id IN $nodeIds AND target.id IN $nodeIds AND r.deletedVersion IS NULL RETURN r{.*, source: source.id, target: target.id, properties: properties(r)} AS relationship LIMIT $relationshipLimit', { nodeIds, relationshipLimit })
      const relationships = relationshipResult.records.map((record: any) => record.get('relationship')) as PersistedGraphRelationship[]
      return { nodes, relationships, partial: nodes.length === limit || relationships.length === relationshipLimit }
    }
    if (ids.length) return this.context?.getSubgraph(ids, options.depth, options.limit) ?? { nodes: [], relationships: [] }
    if (!this.context) return { nodes: [], relationships: [], partial: false }
    const snapshot = await this.context.getSnapshot()
    let nodes = snapshot.nodes
    if (filters.nodeType) nodes = nodes.filter(n => n.nodeType === filters.nodeType)
    if (filters.sourceSystem) nodes = nodes.filter(n => n.sourceSystem === filters.sourceSystem)
    const nodeIds = new Set(nodes.map(n => n.id))
    const related = snapshot.relationships.filter(r => {
      const s = typeof r.source === 'object' ? (r.source as any).id : (r.source as string)
      const t = typeof r.target === 'object' ? (r.target as any).id : (r.target as string)
      return nodeIds.has(s) && nodeIds.has(t)
    })
    nodes = nodes.slice(0, filters.limit ?? 10000)
    return { nodes, relationships: related.slice(0, filters.relationshipLimit ?? 50000), partial: false }
  }
  async getDashboardSummary(filters: GraphReadFilters = {}) {
    if (this.usingNeo4j()) {
      const parameters = { nodeType: filters.nodeType ?? null, sourceSystem: filters.sourceSystem ?? null, risk: filters.risk ?? null, status: filters.status ?? null }
      const base = `MATCH (n:GraphNode) WHERE ${filterCypher}`
      const totals = await this.neo4j.read(`${base} RETURN count(n) AS totalNodes, sum(CASE WHEN n.nodeType IN ['USER','LINUX_USER','SERVICE_ACCOUNT','MANAGED_SERVICE_ACCOUNT'] THEN 1 ELSE 0 END) AS totalIdentities, sum(CASE WHEN n.status='ACTIVE' THEN 1 ELSE 0 END) AS activeAccounts, sum(CASE WHEN n.status='DISABLED' THEN 1 ELSE 0 END) AS disabledAccounts, sum(CASE WHEN n.privileged=true THEN 1 ELSE 0 END) AS privilegedAccounts, sum(CASE WHEN n.nodeType IN ['GROUP','LINUX_GROUP'] THEN 1 ELSE 0 END) AS groups`, parameters)
      const grouped = async (property: string) => { const result = await this.neo4j.read(`${base} RETURN n.${property} AS key, count(n) AS count`, parameters); return Object.fromEntries(result.records.filter((record: any) => record.get('key') != null).map((record: any) => [record.get('key'), Number(value(record, 'count'))])) }
      const relationshipResult = await this.neo4j.read('MATCH ()-[r]->() RETURN count(r) AS count')
      const row = totals.records[0]
      const nodeTypeCounts = await grouped('nodeType')
      return { totalIdentities: Number(value(row, 'totalIdentities') ?? 0), activeAccounts: Number(value(row, 'activeAccounts') ?? 0), disabledAccounts: Number(value(row, 'disabledAccounts') ?? 0), privilegedAccounts: Number(value(row, 'privilegedAccounts') ?? 0), groups: Number(value(row, 'groups') ?? 0), hosts: (nodeTypeCounts.HOST ?? 0) + (nodeTypeCounts.COMPUTER ?? 0), applications: nodeTypeCounts.APPLICATION ?? 0, databases: nodeTypeCounts.DATABASE ?? 0, businessServices: nodeTypeCounts.BUSINESS_SERVICE ?? 0, riskCounts: await grouped('riskLevel'), sourceSystemCounts: await grouped('sourceSystem'), nodeTypeCounts, relationshipCount: Number(value(relationshipResult.records[0], 'count') ?? 0) }
    }
    if (!this.context) return { totalIdentities: 0, activeAccounts: 0, disabledAccounts: 0, privilegedAccounts: 0, groups: 0, hosts: 0, applications: 0, databases: 0, businessServices: 0, riskCounts: {}, sourceSystemCounts: {}, nodeTypeCounts: {}, relationshipCount: 0 }
    const ctx = this.context.getContext()
    const snapshot = await this.context.getSnapshot()
    const nodeTypeCounts: Record<string, number> = {}
    const riskCounts: Record<string, number> = {}
    const sourceSystemCounts: Record<string, number> = {}
    let totalIdentities = 0, activeAccounts = 0, disabledAccounts = 0, privilegedAccounts = 0, groups = 0, hosts = 0, applications = 0, databases = 0, businessServices = 0
    for (const node of snapshot.nodes) {
      nodeTypeCounts[node.nodeType] = (nodeTypeCounts[node.nodeType] ?? 0) + 1
      const risk = node.riskLevel ?? 'NONE'
      riskCounts[risk] = (riskCounts[risk] ?? 0) + 1
      const ss = node.sourceSystem
      sourceSystemCounts[ss] = (sourceSystemCounts[ss] ?? 0) + 1
      if (['USER', 'LINUX_USER', 'SERVICE_ACCOUNT', 'MANAGED_SERVICE_ACCOUNT'].includes(node.nodeType)) totalIdentities++
      if (node.properties?.status === 'ACTIVE') activeAccounts++
      if (node.properties?.status === 'DISABLED') disabledAccounts++
      if ((node as any).privileged) privilegedAccounts++
      if (['GROUP', 'LINUX_GROUP'].includes(node.nodeType)) groups++
      if (node.nodeType === 'HOST' || node.nodeType === 'COMPUTER') hosts++
      if (node.nodeType === 'APPLICATION') applications++
      if (node.nodeType === 'DATABASE') databases++
      if (node.nodeType === 'BUSINESS_SERVICE') businessServices++
    }
    return { totalIdentities, activeAccounts, disabledAccounts, privilegedAccounts, groups, hosts, applications, databases, businessServices, riskCounts, sourceSystemCounts, nodeTypeCounts, relationshipCount: snapshot.relationships.length }
  }
  async getGraphStats() {
    if (this.usingNeo4j()) {
      const nodes = await this.neo4j.read('MATCH (n:GraphNode) WHERE n.deletedVersion IS NULL RETURN count(n) AS count')
      const relationships = await this.neo4j.read('MATCH ()-[r]->() WHERE r.deletedVersion IS NULL RETURN count(r) AS count')
      return { nodeCount: Number(value(nodes.records[0], 'count') ?? 0), relationshipCount: Number(value(relationships.records[0], 'count') ?? 0), database: this.neo4j.config.database, timestamp: new Date().toISOString() }
    }
    if (this.context) { const ctx = this.context.getContext(); return { nodeCount: ctx.nodeCount, relationshipCount: ctx.relationshipCount, database: ctx.mode, timestamp: new Date().toISOString() } }
    return { nodeCount: 0, relationshipCount: 0, database: 'unknown', timestamp: new Date().toISOString() }
  }
  async upsertNodes(nodes: PersistedGraphNode[]) {
    if (!this.neo4j.isEnabled()) return { upserted: 0, skipped: nodes.length }
    if (!nodes.length || !this.enterprise) return this.repository.upsertNodes(nodes)
    const version = await this.enterprise.apply({ source: 'legacy-node-batch', nodes })
    const upserted = version.counts.nodesAdded + version.counts.nodesUpdated
    return { upserted, skipped: nodes.length - upserted }
  }
  async upsertRelationships(relationships: PersistedGraphRelationship[]) {
    if (!this.neo4j.isEnabled()) return { upserted: 0, skipped: relationships.length }
    if (!relationships.length || !this.enterprise) return this.repository.upsertRelationships(relationships)
    const version = await this.enterprise.apply({ source: 'legacy-relationship-batch', relationships })
    const upserted = version.counts.relationshipsAdded + version.counts.relationshipsUpdated
    return { upserted, skipped: relationships.length - upserted }
  }
  async applyVersioned(source: string, nodes: PersistedGraphNode[], relationships: PersistedGraphRelationship[], metadata: Record<string, unknown> = {}) {
    if (!this.neo4j.isEnabled()) return { counts: { nodesAdded: nodes.length, nodesUpdated: 0, nodesDeleted: 0, relationshipsAdded: relationships.length, relationshipsUpdated: 0, relationshipsDeleted: 0 } }
    if (this.enterprise) return this.enterprise.apply({ source, nodes, relationships, metadata })
    const nodeSummary = await this.repository.upsertNodes(nodes), relationshipSummary = await this.repository.upsertRelationships(relationships)
    return { counts: { nodesAdded: nodeSummary.upserted, nodesUpdated: 0, nodesDeleted: 0, relationshipsAdded: relationshipSummary.upserted, relationshipsUpdated: 0, relationshipsDeleted: 0 } }
  }
}
