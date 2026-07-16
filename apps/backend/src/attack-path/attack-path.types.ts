import type{PersistedGraphNode,PersistedGraphRelationship}from'../graph/repositories'
export enum AttackPathType{PRIVILEGE_REACHABILITY='PRIVILEGE_REACHABILITY',DOMAIN_ADMIN='DOMAIN_ADMIN',TIER_ZERO='TIER_ZERO',SUDO_ROOT='SUDO_ROOT',PRODUCTION_HOST='PRODUCTION_HOST',FINANCE_APPLICATION='FINANCE_APPLICATION',CRITICAL_DATABASE='CRITICAL_DATABASE',BUSINESS_SERVICE='BUSINESS_SERVICE',CROSS_DOMAIN='CROSS_DOMAIN',LATERAL_MOVEMENT='LATERAL_MOVEMENT'}
export enum PathConfidence{EXACT='EXACT',HIGH='HIGH',MEDIUM='MEDIUM',LOW='LOW'}
export type RelationshipClass='identity'|'membership'|'privilege'|'access'|'trust'|'infrastructure'|'business dependency'
export interface PathFactor{factor:string;score:number;reason:string}
export interface PathEvidence{relationshipId:string;relationshipType:string;classification:RelationshipClass;sourceSystem:string;why:string;riskContribution:number}
export interface AttackPath{id:string;type:AttackPathType;sourceNode:PersistedGraphNode;targetNode:PersistedGraphNode;nodes:PersistedGraphNode[];relationships:PersistedGraphRelationship[];totalDepth:number;totalRiskScore:number;factorScores:PathFactor[];severity:'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';sourceSystems:string[];accessMode:'DIRECT'|'INHERITED';privilegedTargetType:AttackPathType;explanation:string;confidence:PathConfidence;evidence:PathEvidence[];mitigations:string[];createdAt:string}
export interface AttackPathSearch{sourceNodeId?:string;targetNodeId?:string;targetType?:AttackPathType;maxDepth?:number;maxPaths?:number;directed?:boolean;weighted?:boolean;graphSource?:'auto'|'neo4j'|'memory';allowedRelationshipTypes?:string[];minimumRiskScore?:number;timeoutMs?:number}
export interface PrivilegedTarget{node:PersistedGraphNode;type:AttackPathType;criticality:number;reasons:string[]}
