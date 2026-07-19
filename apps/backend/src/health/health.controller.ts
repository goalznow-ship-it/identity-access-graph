import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ServiceUnavailableException } from '@nestjs/common'
import { DatabaseHealthService } from '../database/database-health.service'
import { Public } from '../auth'

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly database: DatabaseHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    const database = await this.database.check()
    if (database.status !== 'ok') throw new ServiceUnavailableException({ status: 'error', database, timestamp: new Date().toISOString() })
    return {
      status: 'ok',
      database,
      timestamp: new Date().toISOString(),
    }
  }
}
