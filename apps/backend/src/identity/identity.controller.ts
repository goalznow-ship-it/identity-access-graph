import { BadRequestException, Controller, Get, Post, Param, Body, HttpException, HttpStatus, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { IdentityResolutionService } from './identity-resolution.service'
import type { CorrelationRequest, MergePreview } from './identity.types'
import { GraphService } from '../graph'

@ApiTags('Enterprise Identity')
@Controller('identity')
export class IdentityController {
  constructor(private readonly resolutionService: IdentityResolutionService, private readonly graph: GraphService) {}

  @Get('enterprise')
  @ApiOperation({ summary: 'List all enterprise identities' })
  listEnterpriseIdentities() {
    return this.resolutionService.listEnterpriseIdentities()
  }

  @Get('enterprise/:id')
  @ApiOperation({ summary: 'Get enterprise identity details' })
  getEnterpriseIdentity(@Param('id') id: string) {
    const identity = this.resolutionService.getEnterpriseIdentity(id)
    if (!identity) throw new HttpException('Enterprise identity not found.', HttpStatus.NOT_FOUND)
    return identity
  }

  @Post('enterprise/correlate')
  @ApiOperation({ summary: 'Run correlation to find enterprise identity candidates' })
  async correlate(@Body() request: CorrelationRequest) {
    const threshold = request.threshold ?? 70
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) throw new BadRequestException('threshold must be an integer between 0 and 100')
    const graphNodes = await this.graph.exportNodes({
      nodeTypes: ['USER', 'LINUX_USER', 'SERVICE_ACCOUNT', 'MANAGED_SERVICE_ACCOUNT'],
      sourceSystems: request.sourceSystems,
    })
    const result = await this.resolutionService.correlate({ ...request, threshold }, graphNodes.items as unknown as Record<string, unknown>[])
    return result
  }

  @Post('enterprise/:id/merge')
  @ApiOperation({ summary: 'Merge a node into an enterprise identity' })
  async merge(
    @Param('id') id: string,
    @Body() body: { node: Record<string, unknown> },
  ) {
    const existing = this.resolutionService.getEnterpriseIdentity(id)
    if (!existing) throw new HttpException('Enterprise identity not found.', HttpStatus.NOT_FOUND)
    const nodeId = String(body.node?.id ?? '')
    if (!nodeId) throw new BadRequestException('node.id is required')
    const node = await this.graph.getNodeById(nodeId)
    if (!node) throw new HttpException('Target graph node not found.', HttpStatus.NOT_FOUND)
    const result = await this.resolutionService.merge(node as unknown as Record<string, unknown>, existing)
    return result
  }

  @Get('enterprise/:id/merge-preview')
  @ApiOperation({ summary: 'Preview what merging a node would look like' })
  mergePreview(
    @Param('id') id: string,
    @Query('targetId') targetId?: string,
  ): Promise<MergePreview> {
    const identity = this.resolutionService.getEnterpriseIdentity(id)
    if (!identity) throw new HttpException('Enterprise identity not found.', HttpStatus.NOT_FOUND)
    if (!targetId?.trim()) throw new BadRequestException('targetId is required')
    return this.graph.getNodeById(targetId).then((node) => {
      if (!node) throw new HttpException('Target graph node not found.', HttpStatus.NOT_FOUND)
      return this.resolutionService.previewMerge(node as unknown as Record<string, unknown>, identity)
    })
  }

  @Get('enterprise/:id/conflicts')
  @ApiOperation({ summary: 'Get conflicts for an enterprise identity' })
  getConflicts(@Param('id') id: string) {
    const identity = this.resolutionService.getEnterpriseIdentity(id)
    if (!identity) throw new HttpException('Enterprise identity not found.', HttpStatus.NOT_FOUND)
    return identity.conflicts
  }

  @Get('enterprise/:id/timeline')
  @ApiOperation({ summary: 'Get timeline for an enterprise identity' })
  getTimeline(@Param('id') id: string) {
    const identity = this.resolutionService.getEnterpriseIdentity(id)
    if (!identity) throw new HttpException('Enterprise identity not found.', HttpStatus.NOT_FOUND)
    return identity.timeline
  }

  @Get('enterprise/:id/statistics')
  @ApiOperation({ summary: 'Get merge statistics for an enterprise identity' })
  getStatistics(@Param('id') id: string) {
    const identity = this.resolutionService.getEnterpriseIdentity(id)
    if (!identity) throw new HttpException('Enterprise identity not found.', HttpStatus.NOT_FOUND)
    return identity.statistics
  }
}
