import { Injectable } from '@nestjs/common'
import type { CorrelationRecord, CorrelationResult } from '../correlation'
import { convertNode, type ImportedGraphNode } from './node-converter'
import { convertRelationships, type ImportedGraphRelationship, type UnresolvedReference } from './relationship-converter'

export interface GraphPreview {
  nodes: ImportedGraphNode[]
  links: ImportedGraphRelationship[]
  correlationGroups: CorrelationResult['groups']
  unresolvedReferences: UnresolvedReference[]
  conflicts: string[]
  warnings: string[]
  pagination: { nodeLimit: number; relationshipLimit: number; totalNodes: number; totalRelationships: number; truncated: boolean }
}

export interface ConversionResult {
  nodesCreated: number
  relationshipsCreated: number
  recordsMerged: number
  duplicateNodesSkipped: number
  unresolvedReferences: UnresolvedReference[]
  conflicts: string[]
  manualReviewItems: { canonicalIdentityId?: string; recordIds: string[]; reasons: string[] }[]
  nodeTypeCounts: Record<string, number>
  relationshipTypeCounts: Record<string, number>
  sourceSystemCounts: Record<string, number>
  correlationSummary: CorrelationResult['summary']
  preview: GraphPreview
  fullGraph?: { nodes: ImportedGraphNode[]; links: ImportedGraphRelationship[] }
}

@Injectable()
export class GraphConversionService {
  convert(importId: string, records: CorrelationRecord[], correlation: CorrelationResult, nodeLimit = 500, relationshipLimit = 2000): ConversionResult {
    const timestamp = new Date().toISOString()
    const nodeMap = new Map<string, ImportedGraphNode>()
    const recordNodeIds = new Map<string, string>()
    let duplicateNodesSkipped = 0
    for (const record of records) {
      const node = convertNode(importId, record, correlation, timestamp)
      if (!node) continue
      recordNodeIds.set(record.recordId, node.id)
      if (nodeMap.has(node.id)) { duplicateNodesSkipped++; continue }
      nodeMap.set(node.id, node)
    }
    const nodes = [...nodeMap.values()]
    const { relationships, unresolved } = convertRelationships(records, recordNodeIds, nodes)
    const count = <T>(items: T[], key: (item: T) => string) => items.reduce<Record<string, number>>((result, item) => {
      const value = key(item); result[value] = (result[value] ?? 0) + 1; return result
    }, {})
    const conflicts = correlation.groups.flatMap((group) => group.conflicts)
    const manualReviewItems: ConversionResult['manualReviewItems'] = correlation.groups.filter((group) => group.manualReviewRequired).map((group) => ({
      canonicalIdentityId: group.canonicalIdentityId, recordIds: group.matchedRecordIds,
      reasons: [...group.conflicts, ...(group.conflictingFields.length ? [`Conflicting fields: ${group.conflictingFields.join(', ')}`] : []), ...(!group.mergedFields.displayName ? ['Missing canonical display name'] : [])],
    }))
    unresolved.filter((item) => ['manager', 'groupName', 'memberOf'].includes(item.field)).forEach((item) => {
      manualReviewItems.push({ recordIds: [item.recordId], reasons: [`Unresolved ${item.field} reference: ${item.value}`] })
    })
    const previewNodes = nodes.slice(0, Math.max(0, nodeLimit))
    const visible = new Set(previewNodes.map((node) => node.id))
    const previewLinks = relationships.filter((relationship) => visible.has(relationship.source) && visible.has(relationship.target)).slice(0, Math.max(0, relationshipLimit))
    const truncated = previewNodes.length < nodes.length || previewLinks.length < relationships.length
    return {
      nodesCreated: nodes.length, relationshipsCreated: relationships.length,
      recordsMerged: correlation.summary.recordsMerged, duplicateNodesSkipped,
      unresolvedReferences: unresolved, conflicts, manualReviewItems,
      nodeTypeCounts: count(nodes, (node) => node.nodeType),
      relationshipTypeCounts: count(relationships, (relationship) => relationship.relationshipType),
      sourceSystemCounts: count(nodes, (node) => node.sourceSystem), correlationSummary: correlation.summary,
      preview: { nodes: previewNodes, links: previewLinks, correlationGroups: correlation.groups, unresolvedReferences: unresolved, conflicts, warnings: truncated ? ['Preview truncated by requested limits'] : [], pagination: { nodeLimit, relationshipLimit, totalNodes: nodes.length, totalRelationships: relationships.length, truncated } },
      fullGraph: { nodes, links: relationships },
    }
  }
}
