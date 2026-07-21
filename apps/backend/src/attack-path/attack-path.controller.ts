import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AttackPathService } from './attack-path.service'
import type { AttackPathSearch } from './attack-path.types'
import { optionalEnum, optionalInteger } from '../common/http-validation'
import { PlatformRole, Roles } from '../auth'
const csvCell=(value:unknown)=>{const str=String(value??'');const escaped=str.replace(/"/g,'""');const prefixed=/^[=+\-@\t]/.test(escaped)?`'${escaped}`:escaped;return`"${prefixed}"`}
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
  @Post('from/:nodeId') from(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.from(nodeId,body)}
  @Post('to/:nodeId') to(@Param('nodeId')nodeId:string,@Body()body:AttackPathSearch){return this.paths.to(nodeId,body)}
  @Get(':id') get(@Param('id')id:string){return this.paths.get(id)}
}
