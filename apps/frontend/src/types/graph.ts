export type NodeType =
  | 'USER' | 'GROUP' | 'ROLE' | 'PERMISSION'
  | 'DEPARTMENT' | 'TEAM' | 'MANAGER'
  | 'FOREST' | 'DOMAIN' | 'ORGANIZATIONAL_UNIT'
  | 'COMPUTER' | 'HOST' | 'OPERATING_SYSTEM'
  | 'SITE' | 'SUBNET' | 'GROUP_POLICY'
  | 'SERVICE_ACCOUNT' | 'MANAGED_SERVICE_ACCOUNT'
  | 'APPLICATION' | 'DATABASE' | 'BUSINESS_SERVICE'
  | 'LINUX_USER' | 'LINUX_GROUP' | 'SUDO_POLICY' | 'SSH_KEY'

export type RelationshipType =
  | 'MEMBER_OF' | 'HAS_PERMISSION' | 'REPORTS_TO' | 'MANAGES'
  | 'BELONGS_TO' | 'RUNS_ON' | 'INSTALLED_ON' | 'CONNECTS_TO'
  | 'CONTAINS' | 'PART_OF' | 'TRUSTS' | 'DELEGATES'
  | 'APPLIES_TO' | 'HAS_ACCESS' | 'OWNS' | 'DEPENDS_ON'
  | 'LINKED_TO' | 'HOSTED_ON' | 'LOCATED_IN' | 'AUTHENTICATES_TO'
  | 'MANAGES_THROUGH'
  | 'HAS_ROLE' | 'GRANTS' | 'HAS_ACCESS_TO' | 'EXISTS_IN' | 'USES'
  | 'SUPPORTS' | 'MANAGED_BY' | 'HAS_SSH_KEY' | 'HAS_SUDO_POLICY'

export type SourceSystem =
  | 'ACTIVE_DIRECTORY' | 'FREE_IPA' | 'LINUX'
  | 'ENTRA_ID' | 'ORACLE' | 'POSTGRESQL'
  | 'VMWARE' | 'AWS_IAM' | 'AZURE_AD'
  | 'LDAP' | 'OKTA' | 'KEYCLOAK' | 'GCP' | 'CUSTOM' | 'MANUAL'

export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface GraphNode {
  id: string
  displayName: string
  nodeType: NodeType
  sourceSystem: SourceSystem
  riskLevel: RiskLevel
  description?: string
  sourceId?: string
  properties: Record<string, unknown>
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface GraphLink {
  id: string
  source: string
  target: string
  relationshipType: RelationshipType
  sourceSystem: SourceSystem
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface GraphFiltersState {
  systems: SourceSystem[]
  nodeTypes: NodeType[]
  relationshipTypes: RelationshipType[]
  riskLevels: RiskLevel[]
  searchQuery: string
}

export type HighlightMode = 'none' | 'direct' | 'all'

export interface DependencyInfo {
  upstream: string[]
  downstream: string[]
  allUpstream: string[]
  allDownstream: string[]
}
