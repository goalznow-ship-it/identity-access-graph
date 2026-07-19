import type { PersistedGraphNode, PersistedGraphRelationship } from '../graph/repositories'

export enum AttackPathType {
  PRIVILEGE_REACHABILITY = 'PRIVILEGE_REACHABILITY', DOMAIN_ADMIN = 'DOMAIN_ADMIN', TIER_ZERO = 'TIER_ZERO',
  SUDO_ROOT = 'SUDO_ROOT', PRODUCTION_HOST = 'PRODUCTION_HOST', FINANCE_APPLICATION = 'FINANCE_APPLICATION',
  CRITICAL_DATABASE = 'CRITICAL_DATABASE', BUSINESS_SERVICE = 'BUSINESS_SERVICE', CROSS_DOMAIN = 'CROSS_DOMAIN',
  LATERAL_MOVEMENT = 'LATERAL_MOVEMENT', IDENTITY_TO_APPLICATION = 'IDENTITY_TO_APPLICATION',
  APPLICATION_TO_DATABASE = 'APPLICATION_TO_DATABASE', PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
}
export enum PathConfidence { EXACT = 'EXACT', HIGH = 'HIGH', MEDIUM = 'MEDIUM', LOW = 'LOW' }
export type PathAlgorithm = 'shortest' | 'weighted' | 'all'
export type RelationshipClass = 'identity' | 'membership' | 'privilege' | 'access' | 'trust' | 'infrastructure' | 'business dependency'
export interface PathFactor { factor: string; score: number; reason: string }
export interface PathEvidence { relationshipId: string; relationshipType: string; classification: RelationshipClass; sourceSystem: string; why: string; riskContribution: number }
export interface AttackPath { id: string; type: AttackPathType; sourceNode: PersistedGraphNode; targetNode: PersistedGraphNode; nodes: PersistedGraphNode[]; relationships: PersistedGraphRelationship[]; totalDepth: number; totalWeight: number; totalRiskScore: number; factorScores: PathFactor[]; severity: 'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; sourceSystems: string[]; accessMode: 'DIRECT'|'INHERITED'; privilegedTargetType: AttackPathType; explanation: string; confidence: PathConfidence; evidence: PathEvidence[]; mitigations: string[]; createdAt: string }
export interface AttackPathSearch { sourceNodeId?: string; targetNodeId?: string; targetType?: AttackPathType; maxDepth?: number; maxPaths?: number; directed?: boolean; weighted?: boolean; algorithm?: PathAlgorithm; graphSource?: 'auto'|'neo4j'|'memory'; allowedRelationshipTypes?: string[]; minimumRiskScore?: number; timeoutMs?: number }
export interface PrivilegedTarget { node: PersistedGraphNode; type: AttackPathType; criticality: number; reasons: string[] }
export interface AttackPathRun { id: string; status: 'RUNNING'|'COMPLETED'|'FAILED'; request: AttackPathSearch; pathCount: number; durationMs: number|null; error?: string; startedAt: string; completedAt?: string }
export interface BlastRadiusResult { nodeId: string; reachableNodeCount: number; privilegedTargetCount: number; maximumDepth: number; affectedNodes: PersistedGraphNode[]; privilegedTargets: PrivilegedTarget[] }
export interface ChokePoint { node: PersistedGraphNode; pathCount: number; percentage: number; sourceCount: number; targetCount: number }
