import { Injectable, NotFoundException, Optional } from '@nestjs/common'
import { EnterpriseGraphService, GraphService } from '../graph'
import type { PersistedGraphNode, PersistedGraphRelationship } from '../graph'
import { ImportsService } from './imports.service'
import { RiskGraphSourceService } from '../risk'
import { ImportGraphChunkService } from './import-graph-chunk.service'

export interface ImportPersistenceSummary {
  nodesUpserted: number
  relationshipsUpserted: number
  skipped: number
  conflicts: number
  durationMs: number
  storageMode: 'neo4j' | 'import-session'
  warning?: string
}

export interface ImportGraphPersistence {
  persistConvertedGraph(importId: string): Promise<ImportPersistenceSummary>
  persistGraphPreview(importId: string): Promise<ImportPersistenceSummary>
}

@Injectable()
export class ImportGraphPersistenceService implements ImportGraphPersistence {
  constructor(
    private readonly imports: ImportsService,
    private readonly graph: GraphService,
    @Optional() private readonly riskSource?: RiskGraphSourceService,
    @Optional() private readonly enterpriseGraph?: EnterpriseGraphService,
    @Optional() private readonly graphChunks?: ImportGraphChunkService,
  ) {}

  persistConvertedGraph(importId: string) { return this.persist(importId) }
  persistGraphPreview(importId: string) { return this.persist(importId) }

  private async persist(importId: string): Promise<ImportPersistenceSummary> {
    const started = Date.now()
    const conversion = this.imports.getConversionResult(importId)
    if (!conversion) throw new NotFoundException('Graph conversion has not been run')
    const completeGraph = conversion.fullGraph ?? await this.graphChunks?.load(importId) ?? conversion.preview
    await this.riskSource?.setMemoryGraph({ nodes: completeGraph.nodes, relationships: completeGraph.links })

    const persistenceEnabled = typeof (this.graph as any).isPersistenceEnabled === 'function' ? (this.graph as any).isPersistenceEnabled() : true
    if (!persistenceEnabled) {
      return {
        nodesUpserted: conversion.nodesCreated,
        relationshipsUpserted: conversion.relationshipsCreated,
        skipped: conversion.duplicateNodesSkipped,
        conflicts: conversion.conflicts.length,
        durationMs: Date.now() - started,
        storageMode: 'import-session',
        warning: 'Neo4j is disabled. The graph remains available from the active import session and is not durable across backend restarts.',
      }
    }

    const nodes = completeGraph.nodes as PersistedGraphNode[]
    const relationships = completeGraph.links as PersistedGraphRelationship[]
    if (this.enterpriseGraph) {
      const version = await this.enterpriseGraph.apply({ source: `import:${importId}`, description: `Imported graph ${importId}`, metadata: { importId }, nodes, relationships })
      return { nodesUpserted: version.counts.nodesAdded + version.counts.nodesUpdated, relationshipsUpserted: version.counts.relationshipsAdded + version.counts.relationshipsUpdated, skipped: conversion.duplicateNodesSkipped, conflicts: conversion.conflicts.length, durationMs: Date.now() - started, storageMode: 'neo4j' }
    }
    const nodeSummary = await this.graph.upsertNodes(nodes)
    const relationshipSummary = await this.graph.upsertRelationships(relationships)
    return {
      nodesUpserted: nodeSummary.upserted,
      relationshipsUpserted: relationshipSummary.upserted,
      skipped: nodeSummary.skipped + relationshipSummary.skipped,
      conflicts: conversion.conflicts.length,
      durationMs: Date.now() - started,
      storageMode: 'neo4j',
    }
  }
}
