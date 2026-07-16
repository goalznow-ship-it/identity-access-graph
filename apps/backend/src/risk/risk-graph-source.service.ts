import { Injectable } from '@nestjs/common'
import { Neo4jService } from '../neo4j'
import { GraphService } from '../graph'
import { allNodesFlat,relationships } from '../../../../packages/mock-data/src'
import type { GraphSnapshot } from './risk.types'

const mockGraph:GraphSnapshot={
  nodes:allNodesFlat.map((node:any)=>({id:node.id,displayName:node.displayName??node.name??node.id,nodeType:String(node.nodeType),sourceSystem:String(node.sourceSystem),sourceId:node.sourceId,riskLevel:String(node.riskLevel??'NONE'),properties:{...node.properties,status:node.status,privileged:node.privileged,department:node.department,environment:node.environment,managerId:node.managerId}})),
  relationships:relationships.map((relationship:any)=>({id:relationship.id,source:relationship.sourceNodeId,target:relationship.targetNodeId,relationshipType:String(relationship.relationshipType),sourceSystem:String(relationship.sourceSystem),properties:relationship.properties})),
}
@Injectable()
export class RiskGraphSourceService{
  private memory:GraphSnapshot=mockGraph
  constructor(private graph:GraphService,private neo4j:Neo4jService){}
  setMemoryGraph(graph:GraphSnapshot){this.memory=graph}
  async load(source:'auto'|'neo4j'|'memory'='auto'):Promise<GraphSnapshot>{if(source==='memory'||(source==='auto'&&!this.neo4j.isEnabled()))return this.memory;const result=await this.graph.getSubgraph([],{}, {limit:1000,relationshipLimit:5000});return{nodes:result.nodes,relationships:result.relationships}}
}
