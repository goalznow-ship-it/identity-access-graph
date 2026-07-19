import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AttackPathRepository } from '../attack-path.repository'
import { AttackPathService } from '../attack-path.service'
import { PathExplanationService } from '../path-explanation.service'
import { PathScoringService } from '../path-scoring.service'
import { PrivilegeTargetService } from '../privilege-target.service'

const nodes=[{id:'identity-1',displayName:'Analyst',nodeType:'USER',sourceSystem:'ACTIVE_DIRECTORY',riskLevel:'LOW',properties:{}},{id:'app-1',displayName:'Billing',nodeType:'APPLICATION',sourceSystem:'ENTRA_ID',riskLevel:'HIGH',properties:{sensitive:true}},{id:'db-1',displayName:'Ledger',nodeType:'DATABASE',sourceSystem:'CMDB',riskLevel:'CRITICAL',properties:{critical:true}}]
const relationships=[{id:'access-1',source:'identity-1',target:'app-1',relationshipType:'HAS_ACCESS_TO',sourceSystem:'ENTRA_ID',properties:{}},{id:'uses-1',source:'app-1',target:'db-1',relationshipType:'USES',sourceSystem:'CMDB',properties:{}}]
describe('attack path Neo4j integration',()=>{
  it('loads a Neo4j subgraph and discovers an application-to-database path',async()=>{let cypher='',parameters:any;const neo4j={isEnabled:()=>true,read:async(q:string,p:any)=>{cypher=q;parameters=p;return{records:[{get:(key:string)=>key==='nodes'?nodes:relationships}]}}};const repository=new AttackPathRepository(neo4j as any,{load:async()=>{throw new Error('memory fallback used')}}as any);const service=new AttackPathService(repository,new PrivilegeTargetService(),new PathScoringService(),new PathExplanationService(),{list:()=>[],scan:async()=>({})}as any);const result=await service.applicationToDatabases('app-1',{graphSource:'neo4j'});assert.equal(result.count,1);assert.deepEqual(result.paths[0].nodes.map(node=>node.id),['app-1','db-1']);assert.match(cypher,/MATCH path=/);assert.equal(parameters.sourceId,'app-1');assert.ok(parameters.types.includes('USES'))})
})
