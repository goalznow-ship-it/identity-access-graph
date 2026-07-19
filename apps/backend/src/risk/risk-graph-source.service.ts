import { Injectable, OnModuleInit, Optional, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Neo4jService } from '../neo4j'
import { GraphService } from '../graph'
import { allNodesFlat,relationships } from '../../../../packages/mock-data/src'
import type { GraphSnapshot } from './risk.types'
import { OperationalStoreService } from '../database/operational-store.service'

const mockGraph:GraphSnapshot={
  nodes:allNodesFlat.map((node:any)=>({id:node.id,displayName:node.displayName??node.name??node.id,nodeType:String(node.nodeType),sourceSystem:String(node.sourceSystem),sourceId:node.sourceId,riskLevel:String(node.riskLevel??'NONE'),properties:{...node.properties,status:node.status,privileged:node.privileged,department:node.department,environment:node.environment,managerId:node.managerId}})),
  relationships:relationships.map((relationship:any)=>({id:relationship.id,source:relationship.sourceNodeId,target:relationship.targetNodeId,relationshipType:String(relationship.relationshipType),sourceSystem:String(relationship.sourceSystem),properties:relationship.properties})),
}
@Injectable()
export class RiskGraphSourceService implements OnModuleInit{
  private memory:GraphSnapshot
  private memoryAvailable:boolean
  private readonly allowDemoData:boolean
  constructor(private graph:GraphService,private neo4j:Neo4jService,@Optional()private store?:OperationalStoreService,@Optional()config?:ConfigService){this.allowDemoData=config?.get<boolean>('risk.allowDemoData')??process.env.NODE_ENV!=='production';this.memory=this.allowDemoData?mockGraph:{nodes:[],relationships:[]};this.memoryAvailable=this.allowDemoData}
  async onModuleInit(){const row=await this.store?.loadGraph('imported');if(row){this.memory=row.payload as unknown as GraphSnapshot;this.memoryAvailable=true}}
  async setMemoryGraph(graph:GraphSnapshot){this.memory=graph;this.memoryAvailable=true;this.store?.saveGraph('imported',graph as unknown as Record<string,unknown>);await this.store?.flush()}
  status(){return{neo4jAvailable:this.neo4j.isEnabled(),memoryAvailable:this.memoryAvailable,memorySource:this.memoryAvailable?(this.allowDemoData&&this.memory===mockGraph?'demo':'imported'):'unavailable'}}
  async load(source:'auto'|'neo4j'|'memory'='auto'):Promise<GraphSnapshot>{if(source==='memory'||(source==='auto'&&!this.neo4j.isEnabled())){if(!this.memoryAvailable)throw new ServiceUnavailableException('No risk graph is available. Enable Neo4j or persist an imported graph before running analysis.');return this.memory}const result=await this.graph.getSubgraph([],{}, {limit:1000,relationshipLimit:5000});return{nodes:result.nodes,relationships:result.relationships}}
}
