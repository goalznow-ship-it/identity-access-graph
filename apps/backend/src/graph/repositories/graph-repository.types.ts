export interface PersistedGraphNode{id:string;displayName:string;nodeType:string;sourceSystem:string;sourceId?:string;riskLevel?:string;properties?:Record<string,unknown>}
export interface PersistedGraphRelationship{id:string;source:string;target:string;relationshipType:string;sourceSystem:string;properties?:Record<string,unknown>}
export interface NeighborOptions{direction?:'incoming'|'outgoing'|'both';relationshipTypes?:string[];limit?:number}
export interface SearchOptions{nodeTypes?:string[];sourceSystems?:string[];riskLevels?:string[];limit?:number;offset?:number}
export interface SubgraphOptions{depth?:number;limit?:number}
export interface BatchWriteSummary{upserted:number;skipped:number}
