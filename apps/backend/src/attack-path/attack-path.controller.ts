import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AttackPathService } from './attack-path.service'
import { AttackPathType, type AttackPathSearch } from './attack-path.types'
import { optionalBoolean, optionalEnum, optionalInteger } from '../common/http-validation'
import { PlatformRole, Roles } from '../auth'

const queryRequest=(q:Record<string,string>):AttackPathSearch=>({targetType:optionalEnum(q.targetType,'targetType',Object.values(AttackPathType)),algorithm:optionalEnum(q.algorithm,'algorithm',['shortest','weighted','all']),maxDepth:optionalInteger(q.maxDepth,'maxDepth',{min:1,max:12}),maxPaths:optionalInteger(q.maxPaths,'maxPaths',{min:1,max:100}),directed:optionalBoolean(q.directed,'directed'),graphSource:optionalEnum(q.graphSource,'graphSource',['auto','neo4j','memory']),minimumRiskScore:optionalInteger(q.minimumRiskScore,'minimumRiskScore',{min:0,max:100})})
const csvCell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`
@Controller('attack-path')
export class AttackPathController {
  constructor(private paths:AttackPathService){}
  @Roles(PlatformRole.ANALYST) @Post('search') search(@Body()body:AttackPathSearch){return this.paths.search(body??{})}
  @Roles(PlatformRole.ANALYST) @Post('escalation') escalation(@Body()body:AttackPathSearch){return this.paths.escalation(body??{})}
  @Roles(PlatformRole.ANALYST) @Post('identity-to-application/:nodeId') identityToApplication(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.identityToApplications(nodeId,body??{})}
  @Roles(PlatformRole.ANALYST) @Post('application-to-database/:nodeId') applicationToDatabase(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.applicationToDatabases(nodeId,body??{})}
  @Roles(PlatformRole.ANALYST) @Post('blast-radius/:nodeId') blastRadius(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.blastRadius(nodeId,body??{})}
  @Roles(PlatformRole.ANALYST) @Post('choke-points') chokePoints(@Body()body:AttackPathSearch){return this.paths.chokePoints(body??{})}
  @Get('history') history(@Query('limit')limit?:string){return this.paths.history(optionalInteger(limit,'limit',{min:1,max:500})??50)}
  @Get('history/:id') historyRun(@Param('id')id:string){return this.paths.historyRun(id)}
  @Get('export') export(@Query('format')rawFormat='json',@Query('limit')rawLimit='200',@Res()response:Response){const format=optionalEnum(rawFormat,'format',['json','csv'])!;const paths=this.paths.top(optionalInteger(rawLimit,'limit',{min:1,max:5000})!);if(format==='json'){response.setHeader('Content-Disposition','attachment; filename="attack-paths.json"');return response.json(paths)}const header=['id','type','sourceNodeId','sourceName','targetNodeId','targetName','depth','weight','riskScore','severity','createdAt'];const rows=paths.map(path=>[path.id,path.type,path.sourceNode.id,path.sourceNode.displayName,path.targetNode.id,path.targetNode.displayName,path.totalDepth,path.totalWeight,path.totalRiskScore,path.severity,path.createdAt]);response.setHeader('Content-Type','text/csv; charset=utf-8');response.setHeader('Content-Disposition','attachment; filename="attack-paths.csv"');return response.send([header,...rows].map(row=>row.map(csvCell).join(',')).join('\n'))}
  @Get('top') top(@Query('limit')limit?:string){return this.paths.top(optionalInteger(limit,'limit',{min:1,max:500})??10)}
  @Get('targets') targets(@Query('graphSource')source?:string){return this.paths.targets(optionalEnum(source,'graphSource',['auto','neo4j','memory']))}
  @Get('summary') summary(){return this.paths.summary()}
  @Get('from/:nodeId') from(@Param('nodeId')nodeId:string,@Query()query:Record<string,string>){return this.paths.from(nodeId,queryRequest(query))}
  @Get('to/:nodeId') to(@Param('nodeId')nodeId:string,@Query()query:Record<string,string>){return this.paths.to(nodeId,queryRequest(query))}
  @Get(':id') get(@Param('id')id:string){return this.paths.get(id)}
}
