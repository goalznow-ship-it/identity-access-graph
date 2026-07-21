import { Injectable, OnModuleInit, Optional, ServiceUnavailableException } from '@nestjs/common'
import { Neo4jService } from '../neo4j'
import { GraphService } from '../graph'
import type { GraphSnapshot } from './risk.types'
import { OperationalStoreService } from '../database/operational-store.service'

@Injectable()
export class RiskGraphSourceService implements OnModuleInit{
  private memory:GraphSnapshot={nodes:[],relationships:[]}
  private memoryAvailable=false
  constructor(private graph:GraphService,private neo4j:Neo4jService,@Optional()private store?:OperationalStoreService){}
  async onModuleInit(){const row=await this.store?.loadGraph('imported');if(row){this.memory=row.payload as unknown as GraphSnapshot;this.memoryAvailable=true}}
  async setMemoryGraph(graph:GraphSnapshot){this.memory=graph;this.memoryAvailable=true;this.store?.saveGraph('imported',graph as unknown as Record<string,unknown>);await this.store?.flush()}
  status(){return{neo4jAvailable:this.neo4j.isEnabled(),memoryAvailable:this.memoryAvailable,memorySource:this.memoryAvailable?'imported':'unavailable'}}
  async load(source:'auto'|'neo4j'|'memory'='auto'):Promise<GraphSnapshot>{if(source==='memory'||(source==='auto'&&!this.neo4j.isEnabled())){if(!this.memoryAvailable)throw new ServiceUnavailableException('No risk graph is available. Enable Neo4j or persist an imported graph before running analysis.');return this.memory}const result=await this.graph.getSubgraph([],{}, {limit:5000,relationshipLimit:25000});return{nodes:result.nodes,relationships:result.relationships}}
}
