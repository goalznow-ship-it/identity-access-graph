import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ImportWorkerService } from './import-worker.service'

@ApiTags('Import Workers')
@Controller('health/import-workers')
export class ImportWorkerController {
  constructor(private readonly workers: ImportWorkerService) {}
  @Get() @ApiOperation({ summary: 'Get durable import worker and queue health' }) health() { return this.workers.health() }
}
