import { allNodesFlat } from './nodes'
import { relationships } from './relationships'

export interface ValidationResult {
  valid: boolean
  nodeCount: number
  relationshipCount: number
  duplicates: string[]
  missingSourceNodes: string[]
  missingTargetNodes: string[]
  errors: string[]
}

export function validateDataset(): ValidationResult {
  const errors: string[] = []
  const duplicates: string[] = []
  const missingSourceNodes: string[] = []
  const missingTargetNodes: string[] = []

  const allNodeIds = new Set<string>()
  const seenNodeIds = new Set<string>()

  for (const node of allNodesFlat) {
    if (seenNodeIds.has(node.id)) {
      duplicates.push(`Duplicate node ID: ${node.id} (${node.displayName})`)
    }
    seenNodeIds.add(node.id)
    allNodeIds.add(node.id)
  }

  const relIds = new Set<string>()
  for (const rel of relationships) {
    if (relIds.has(rel.id)) {
      duplicates.push(`Duplicate relationship ID: ${rel.id}`)
    }
    relIds.add(rel.id)

    if (!allNodeIds.has(rel.sourceNodeId)) {
      missingSourceNodes.push(
        `Relationship ${rel.id}: source node '${rel.sourceNodeId}' not found`,
      )
    }
    if (!allNodeIds.has(rel.targetNodeId)) {
      missingTargetNodes.push(
        `Relationship ${rel.id}: target node '${rel.targetNodeId}' not found`,
      )
    }
  }

  if (duplicates.length > 0) {
    errors.push(`Found ${duplicates.length} duplicate(s)`)
  }
  if (missingSourceNodes.length > 0) {
    errors.push(`Found ${missingSourceNodes.length} missing source node(s)`)
  }
  if (missingTargetNodes.length > 0) {
    errors.push(`Found ${missingTargetNodes.length} missing target node(s)`)
  }

  return {
    valid: errors.length === 0,
    nodeCount: allNodesFlat.length,
    relationshipCount: relationships.length,
    duplicates,
    missingSourceNodes,
    missingTargetNodes,
    errors,
  }
}
