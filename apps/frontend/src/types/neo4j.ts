import type { GraphData, GraphNode, GraphLink } from './graph'
export type GraphSourceMode = 'imported'|'neo4j'
export type Neo4jHealthState = 'connected'|'disabled'|'unreachable'|'degraded'|'checking'
export interface Neo4jHealth { status: 'ok'|'error'|'disabled'; connectivity: boolean; database: string; serverAgent?: string; latencyMs: number; timestamp: string }
export interface BackendGraphNode { id: string; displayName?: string; nodeType?: string; sourceSystem?: string; sourceId?: string; riskLevel?: string; status?: string; properties?: Record<string, unknown>; [key: string]: unknown }
export interface BackendGraphRelationship { id: string; source: string|{ id: string }; target: string|{ id: string }; relationshipType?: string; sourceSystem?: string; properties?: Record<string, unknown>; [key: string]: unknown }
export interface BackendSubgraph { nodes: BackendGraphNode[]; relationships?: BackendGraphRelationship[]; links?: BackendGraphRelationship[]; partial?: boolean }
export interface Neo4jNeighbors { nodes: GraphNode[]; links: GraphLink[]; partial: boolean }
export interface Neo4jGraphState { data: GraphData|null; loading: boolean; error: string|null; partial: boolean }
export interface DashboardSummary { totalIdentities:number;activeAccounts:number;disabledAccounts:number;privilegedAccounts:number;groups:number;hosts:number;applications:number;databases:number;businessServices:number;riskCounts:Record<string,number>;sourceSystemCounts:Record<string,number>;nodeTypeCounts:Record<string,number>;relationshipCount:number }
export interface GraphStatsResponse { nodeCount:number;relationshipCount:number;database:string;timestamp:string }
