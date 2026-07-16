import type { PersistedGraphNode, PersistedGraphRelationship } from '../graph/repositories'
export type { PersistedGraphNode, PersistedGraphRelationship } from '../graph/repositories'
export enum FindingCategory { PRIVILEGE='PRIVILEGE',ACCOUNT='ACCOUNT',ACCESS='ACCESS',CONFIGURATION='CONFIGURATION',IDENTITY='IDENTITY',INFRASTRUCTURE='INFRASTRUCTURE',SEGREGATION_OF_DUTIES='SEGREGATION_OF_DUTIES',LATERAL_MOVEMENT='LATERAL_MOVEMENT',DATA_EXPOSURE='DATA_EXPOSURE' }
export enum FindingSeverity { INFO='INFO',LOW='LOW',MEDIUM='MEDIUM',HIGH='HIGH',CRITICAL='CRITICAL' }
export enum FindingStatus { OPEN='OPEN',ACKNOWLEDGED='ACKNOWLEDGED',RESOLVED='RESOLVED',SUPPRESSED='SUPPRESSED' }
export interface ScoreFactor { factor:string;score:number;reason:string }
export interface RiskScore { totalScore:number;factorScores:ScoreFactor[];severity:FindingSeverity;explanation:string;confidence:number }
export interface RiskFinding { id:string;ruleId:string;title:string;description:string;category:FindingCategory;severity:FindingSeverity;confidence:number;status:FindingStatus;score:number;scoreFactors:ScoreFactor[];affectedNodes:string[];affectedRelationships:string[];evidencePaths:string[][];sourceSystems:string[];firstDetected:string;lastDetected:string;remediationGuidance:string;metadata:Record<string,unknown> }
export interface GraphSnapshot { nodes:PersistedGraphNode[];relationships:PersistedGraphRelationship[] }
export interface RuleMatch { nodes:string[];relationships?:string[];path?:string[];metadata?:Record<string,unknown>;description?:string }
export interface RiskRule { id:string;title:string;category:FindingCategory;defaultSeverity:FindingSeverity;remediation:string;detect(graph:GraphSnapshot,maxDepth:number):RuleMatch[] }
export interface FindingFilters {severity?:FindingSeverity;category?:FindingCategory;status?:FindingStatus;sourceSystem?:string;nodeId?:string;ruleId?:string;limit?:number;offset?:number}
export interface RiskScanRequest {ruleIds?:string[];graphSource?:'auto'|'neo4j'|'memory';maxDepth?:number}
