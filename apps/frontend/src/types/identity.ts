import type { GraphNode, RiskLevel, SourceSystem } from './graph'

export interface UserIdentity {
  node: GraphNode
  email?: string
  firstName?: string
  lastName?: string
  principalName?: string
  samAccountName?: string
  jobTitle?: string
  officeLocation?: string
  departmentId?: string
  teams?: string[]
  managerId?: string
  mfaEnabled?: boolean
  locked?: boolean
  sourceId?: string
  employeeId?: string
}

export interface CorrelatedIdentity {
  node: GraphNode
  source: SourceSystem
  email?: string
  principalName?: string
  uid?: number
  locked?: boolean
  lastLogin?: string
  lastPasswordChange?: string
}

export interface Membership {
  node: GraphNode
  direct: boolean
  relationshipType: string
}

export interface EffectiveAccess {
  type: string
  targetId: string
  targetName: string
  targetType: string
  riskLevel: RiskLevel
  sourceSystem: SourceSystem
  paths: AccessPath[]
}

export interface AccessPath {
  nodes: PathNode[]
  direct: boolean
}

export interface PathNode {
  id: string
  displayName: string
  nodeType: string
  relationshipType: string
  sourceSystem: SourceSystem
  riskLevel: RiskLevel
}

export interface RiskFinding {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  relatedNodes: string[]
}

export interface UserProfileData {
  user: UserIdentity
  correlatedIdentities: CorrelatedIdentity[]
  directGroups: Membership[]
  indirectGroups: Membership[]
  roles: Membership[]
  permissions: Membership[]
  effectiveAccess: EffectiveAccess[]
  dependencies: {
    upstream: GraphNode[]
    downstream: GraphNode[]
  }
  riskFindings: RiskFinding[]
  rawProperties: Record<string, unknown>
}
