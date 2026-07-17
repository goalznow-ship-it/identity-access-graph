import type { PersistedGraphNode, PersistedGraphRelationship } from '../../graph/repositories'

export type EntraObjectType =
  | 'USER' | 'GROUP' | 'ADMINISTRATIVE_UNIT' | 'DIRECTORY_ROLE'
  | 'ROLE_ASSIGNMENT' | 'APPLICATION' | 'ENTERPRISE_APP' | 'SERVICE_PRINCIPAL'
  | 'APP_ROLE' | 'APP_ROLE_ASSIGNMENT' | 'OAUTH_PERMISSION'
  | 'DEVICE' | 'REGISTERED_OWNER' | 'REGISTERED_USER'
  | 'CONDITIONAL_ACCESS_POLICY'

export interface NormalizedEntraObject {
  recordId: string
  objectType: EntraObjectType
  id: string
  attributes: Record<string, unknown>
}

export interface EntraGraphResult {
  nodes: PersistedGraphNode[]
  relationships: PersistedGraphRelationship[]
  warnings: string[]
}
