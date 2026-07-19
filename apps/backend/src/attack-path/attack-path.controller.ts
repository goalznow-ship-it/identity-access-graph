import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AttackPathService } from './attack-path.service'
import { AttackPathType, type AttackPathSearch } from './attack-path.types'

const queryRequest=(q:Record<string,string>):AttackPathSearch=>({targetType:q.targetType as AttackPathType,algorithm:q.algorithm as any,maxDepth:q.maxDepth?Number(q.maxDepth):undefined,maxPaths:q.maxPaths?Number(q.maxPaths):undefined,directed:q.directed===undefined?undefined:q.directed!=='false',graphSource:q.graphSource as any,minimumRiskScore:q.minimumRiskScore?Number(q.minimumRiskScore):undefined})
const csvCell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`
@Controller('attack-path')
export class AttackPathController {
  constructor(private paths:AttackPathService){}
  @Post('search') search(@Body()body:AttackPathSearch){return this.paths.search(body??{})}
  @Post('escalation') escalation(@Body()body:AttackPathSearch){return this.paths.escalation(body??{})}
  @Post('identity-to-application/:nodeId') identityToApplication(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.identityToApplications(nodeId,body??{})}
  @Post('application-to-database/:nodeId') applicationToDatabase(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.applicationToDatabases(nodeId,body??{})}
  @Post('blast-radius/:nodeId') blastRadius(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.blastRadius(nodeId,body??{})}
  @Post('choke-points') chokePoints(@Body()body:AttackPathSearch){return this.paths.chokePoints(body??{})}
  @Get('history') history(@Query('limit')limit?:string){return this.paths.history(limit?Number(limit):50)}
  @Get('history/:id') historyRun(@Param('id')id:string){return this.paths.historyRun(id)}
  @Get('export') export(@Query('format')format='json',@Query('limit')rawLimit='200',@Res()response:Response){const paths=this.paths.top(Number(rawLimit));if(format==='json'){response.setHeader('Content-Disposition','attachment; filename="attack-paths.json"');return response.json(paths)}if(format!=='csv')return response.status(400).json({message:'format must be json or csv'});const header=['id','type','sourceNodeId','sourceName','targetNodeId','targetName','depth','weight','riskScore','severity','createdAt'];const rows=paths.map(path=>[path.id,path.type,path.sourceNode.id,path.sourceNode.displayName,path.targetNode.id,path.targetNode.displayName,path.totalDepth,path.totalWeight,path.totalRiskScore,path.severity,path.createdAt]);response.setHeader('Content-Type','text/csv; charset=utf-8');response.setHeader('Content-Disposition','attachment; filename="attack-paths.csv"');return response.send([header,...rows].map(row=>row.map(csvCell).join(',')).join('\n'))}
  @Get('top') top(@Query('limit')limit?:string){return this.paths.top(limit?Number(limit):10)}
  @Get('targets') targets(@Query('graphSource')source?:'auto'|'neo4j'|'memory'){return this.paths.targets(source)}
  @Get('summary') summary(){return this.paths.summary()}
  @Get('from/:nodeId') from(@Param('nodeId')nodeId:string,@Query()query:Record<string,string>){return this.paths.from(nodeId,queryRequest(query))}
  @Get('to/:nodeId') to(@Param('nodeId')nodeId:string,@Query()query:Record<string,string>){return this.paths.to(nodeId,queryRequest(query))}
  @Get(':id') get(@Param('id')id:string){return this.paths.get(id)}
}
