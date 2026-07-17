export type MergeSource = 'ACTIVE_DIRECTORY' | 'ENTRA_ID' | 'FREE_IPA' | 'LINUX' | 'LDAP' | 'CUSTOM' | 'MANUAL'

export type ConfidenceLevel = 'EXACT' | 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface ConfidenceScore {
  score: number
  level: ConfidenceLevel
  method: string
  matchedField: string
  matchedValue: string
}

export interface MergeFieldMatch {
  field: string
  valueA: string
  valueB: string
  matchType: 'exact' | 'fuzzy' | 'conflict' | 'missing'
}

export interface MergeConflict {
  field: string
  sourceA: MergeSource
  sourceB: MergeSource
  valueA: string
  valueB: string
  severity: 'info' | 'warning' | 'critical'
  resolution?: string
}

export interface EnterpriseIdentitySource {
  source: MergeSource
  nodeId: string
  displayName: string
  confidence: number
  matchedFields: string[]
  lastSeen: string
  properties: Record<string, unknown>
}

export interface EnterpriseIdentity {
  id: string
  canonicalIdentityId: string
  displayName: string
  mergedSources: EnterpriseIdentitySource[]
  confidence: number
  confidenceLevel: ConfidenceLevel
  matchedFields: MergeFieldMatch[]
  conflicts: MergeConflict[]
  timeline: IdentityTimelineEvent[]
  statistics: MergeStatistics
  mergedFields: Record<string, unknown>
  accounts: { source: MergeSource; accountName: string; domain?: string; disabled?: boolean }[]
  groups: string[]
  roles: string[]
  permissions: string[]
  applications: string[]
  servers: string[]
  sudoPolicies: string[]
  sshKeys: string[]
  riskLevel: string
  createdAt: string
  updatedAt: string
}

export interface EnterpriseIdentitySummary {
  id: string
  canonicalIdentityId: string
  displayName: string
  sourceCount: number
  confidence: number
  conflicts: number
  riskLevel: string
}

export interface IdentityTimelineEvent {
  timestamp: string
  type: 'source_added' | 'source_removed' | 'field_merged' | 'confidence_changed' | 'conflict_resolved' | 'manual_override'
  detail: string
  source?: MergeSource
  actor?: string
}

export interface MergeStatistics {
  totalSources: number
  matchedFields: number
  totalConflicts: number
  criticalConflicts: number
  resolvedConflicts: number
  confidenceScore: number
  mergeHistory: { timestamp: string; sources: MergeSource[] }[]
}

export interface MergePreview {
  enterpriseId: string
  current: EnterpriseIdentity
  proposed: EnterpriseIdentity
  newSources: MergeSource[]
  removedSources: MergeSource[]
  changedFields: MergeFieldMatch[]
  newConflicts: MergeConflict[]
  resolvedConflicts: string[]
  impact: string
}

export interface CorrelationCandidate {
  nodeId: string
  source: MergeSource
  displayName: string
  confidence: number
  method: string
  matchedField: string
  matchedValue: string
  properties: Record<string, unknown>
}

export interface CorrelationRequest {
  nodeIds?: string[]
  sourceSystems?: MergeSource[]
  threshold?: number
}

export interface CorrelationResult {
  candidates: CorrelationCandidate[]
  enterpriseIdentities: EnterpriseIdentity[]
}
