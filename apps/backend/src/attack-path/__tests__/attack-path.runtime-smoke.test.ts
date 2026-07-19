import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AttackPathController } from '../attack-path.controller'

describe('attack path runtime smoke',()=>{
  it('wires every enterprise endpoint to the service contract',async()=>{const calls:string[]=[];const service=new Proxy({},{get:(_target,key)=>{if(key==='summary')return()=>({totalPaths:0});if(key==='history')return()=>[];return async()=>{calls.push(String(key));return{paths:[],count:0}}}})as any;const controller=new AttackPathController(service);await controller.search({sourceNodeId:'u'});await controller.escalation({sourceNodeId:'u'});await controller.identityToApplication('u',{});await controller.applicationToDatabase('app',{});await controller.blastRadius('u',{});await controller.chokePoints({});assert.deepEqual(calls,['search','escalation','identityToApplications','applicationToDatabases','blastRadius','chokePoints']);assert.deepEqual(controller.history(),[]);assert.deepEqual(controller.summary(),{totalPaths:0})})
})
