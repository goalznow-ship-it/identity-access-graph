import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { optionalInteger } from '../common/http-validation'
import { validateConnectorCreate, validateConnectorUpdate, validateSyncOptions } from './connector-validation'
import { ConnectorsService } from './connectors.service'

@Controller('connectors')
export class ConnectorsController {
  constructor(private connectors: ConnectorsService) {}
  @Get() list() { return this.connectors.list() }
  @Post() create(@Body() body: unknown) { return this.connectors.create(validateConnectorCreate(body)) }
  @Get(':id') get(@Param('id') id: string) { return this.connectors.get(id) }
  @Patch(':id') update(@Param('id') id: string, @Body() body: unknown) { return this.connectors.update(id, validateConnectorUpdate(body)) }
  @Delete(':id') delete(@Param('id') id: string) { return this.connectors.delete(id) }
  @Post(':id/test') test(@Param('id') id: string) { return this.connectors.test(id) }
  @Post(':id/preview') preview(@Param('id') id: string, @Query('limit') limit?: string) { return this.connectors.preview(id, optionalInteger(limit, 'limit', { min: 1, max: 500 }) ?? 100) }
  @Post(':id/sync') sync(@Param('id') id: string, @Body() body: unknown = {}) { return this.connectors.sync(id, validateSyncOptions(body)) }
  @Get(':id/sync-runs') runs(@Param('id') id: string) { return this.connectors.runs(id) }
  @Get(':id/sync-runs/:runId') run(@Param('id') id: string, @Param('runId') runId: string) { return this.connectors.run(id, runId) }
  @Get(':id/schema') schema(@Param('id') id: string) { return this.connectors.schema(id) }
}
