import { Body,Controller,Get,HttpCode,NotFoundException,Param,Post,Query } from '@nestjs/common';import { GraphService } from './graph.service';import type { PersistedGraphNode,PersistedGraphRelationship } from './repositories';import { EnterpriseGraphService } from './enterprise-graph.service'
@Controller('graph')
export class GraphController{constructor(private readonly graph:GraphService,private readonly enterprise:EnterpriseGraphService){}
  @Get('nodes/:id')async node(@Param('id')id:string){const node=await this.graph.getNodeById(id);if(!node)throw new NotFoundException('Graph node not found');return node}
  @Get('nodes/:id/neighbors')neighbors(@Param('id')id:string,@Query('direction')direction?:'incoming'|'outgoing'|'both',@Query('limit')limit?:string,@Query('depth')depth?:string){return this.graph.getNeighbors(id,{direction,limit:limit?Number(limit):undefined},depth?Number(depth):1)}
  @Get('search')search(@Query('q')query='',@Query('nodeType')nodeType?:string,@Query('sourceSystem')sourceSystem?:string,@Query('risk')risk?:string,@Query('limit')limit?:string,@Query('offset')offset?:string){return this.graph.searchNodes(query,{nodeTypes:nodeType?[nodeType]:[],sourceSystems:sourceSystem?[sourceSystem]:[],riskLevels:risk?[risk]:[],limit:limit?Number(limit):undefined,offset:offset?Number(offset):undefined})}
  @Get('subgraph')subgraph(@Query('ids')ids='',@Query('depth')depth?:string,@Query('limit')limit?:string,@Query('relationshipLimit')relationshipLimit?:string,@Query('nodeType')nodeType?:string,@Query('sourceSystem')sourceSystem?:string,@Query('risk')risk?:string,@Query('status')status?:string){return this.graph.getSubgraph(ids.split(',').filter(Boolean),{depth:depth?Number(depth):undefined,limit:limit?Number(limit):undefined},{limit:limit?Number(limit):undefined,relationshipLimit:relationshipLimit?Number(relationshipLimit):undefined,nodeType,sourceSystem,risk,status})}
  @Get('dashboard-summary')dashboard(@Query('nodeType')nodeType?:string,@Query('sourceSystem')sourceSystem?:string,@Query('risk')risk?:string,@Query('status')status?:string){return this.graph.getDashboardSummary({nodeType,sourceSystem,risk,status})}
  @Get('stats')stats(){return this.graph.getGraphStats()}
  @Get('statistics')statistics(){return this.enterprise.statistics()}
  @Get('versions')versions(@Query('limit')limit?:string){return this.enterprise.listVersions(Number(limit??50))}
  @Post('versions')@HttpCode(200)apply(@Body()body:any){return this.enterprise.apply(body)}
  @Get('snapshots')snapshots(){return this.enterprise.listSnapshots()}
  @Post('snapshots')@HttpCode(200)snapshot(@Body()body:{name?:string}={}){return this.enterprise.createSnapshot(body.name)}
  @Get('snapshots/diff')diff(@Query('from')from:string,@Query('to')to:string){return this.enterprise.diff(from,to)}
  @Get('shortest-path')shortest(@Query('source')source:string,@Query('target')target:string,@Query('maxDepth')depth?:string){return this.enterprise.shortestPath(source,target,Number(depth??8))}
  @Get('blast-radius/:id')blast(@Param('id')id:string,@Query('maxDepth')depth?:string){return this.enterprise.blastRadius(id,Number(depth??4))}
  @Post('nodes/batch')@HttpCode(200)nodes(@Body()body:{nodes:PersistedGraphNode[]}){return this.graph.upsertNodes(body.nodes??[])}
  @Post('relationships/batch')@HttpCode(200)relationships(@Body()body:{relationships:PersistedGraphRelationship[]}){return this.graph.upsertRelationships(body.relationships??[])}}
