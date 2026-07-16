import { RelationshipType, SourceSystem } from '../enums'

export interface Relationship {
  id: string
  relationshipType: RelationshipType
  sourceNodeId: string
  targetNodeId: string
  properties: Record<string, unknown>
  sourceSystem: SourceSystem
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
  enabled?: boolean
  weight?: number
  validFrom?: string
  validUntil?: string
}
