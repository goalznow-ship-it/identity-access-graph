import { Controller, Get, Post, Param, Body, HttpException, HttpStatus, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { IdentityResolutionService } from './identity-resolution.service'
import type { CorrelationRequest, MergePreview } from './identity.types'

@ApiTags('Enterprise Identity')
@Controller('identity')
export class IdentityController {
  constructor(private readonly resolutionService: IdentityResolutionService) {}

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
    const graphNodes: Record<string, unknown>[] = []
    const result = await this.resolutionService.correlate(request, graphNodes)
    return result
  }

  @Post('enterprise/:id/merge')
  @ApiOperation({ summary: 'Merge a node into an enterprise identity' })
  async merge(
    @Param('id') id: string,
    @Body() body: { node: Record<string, unknown> },
  ) {
    const existing = this.resolutionService.getEnterpriseIdentity(id)
    const result = await this.resolutionService.merge(body.node, existing)
    return result
  }

  @Get('enterprise/:id/merge-preview')
  @ApiOperation({ summary: 'Preview what merging a node would look like' })
  mergePreview(
    @Param('id') id: string,
    @Query('targetId') targetId?: string,
  ): MergePreview {
    const identity = this.resolutionService.getEnterpriseIdentity(id)
    if (!identity) throw new HttpException('Enterprise identity not found.', HttpStatus.NOT_FOUND)
    return {
      enterpriseId: id,
      current: identity,
      proposed: identity,
      newSources: [],
      removedSources: [],
      changedFields: [],
      newConflicts: [],
      resolvedConflicts: [],
      impact: 'No changes proposed.',
    }
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
