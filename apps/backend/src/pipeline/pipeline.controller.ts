import { Controller, Post, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { PipelineService } from './pipeline.service'
import { PipelineStatus } from '../../../../packages/shared-types/src'

@ApiTags('Pipeline')
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly service: PipelineService) {}

  @Post('start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start a full pipeline run' })
  @ApiResponse({ status: 200, description: 'Pipeline started or completed' })
  @ApiResponse({ status: 409, description: 'Pipeline already running' })
  async start() {
    try {
      return await this.service.start()
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException((err as Error).message, HttpStatus.CONFLICT)
    }
  }

  @Post('pause')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pause a running pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline paused' })
  @ApiResponse({ status: 409, description: 'Pipeline is not running' })
  async pause() {
    try {
      return await this.service.pause()
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.CONFLICT)
    }
  }

  @Post('resume')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resume a paused pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline resumed and completed' })
  @ApiResponse({ status: 409, description: 'Pipeline is not paused' })
  async resume() {
    try {
      return await this.service.resume()
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.CONFLICT)
    }
  }

  @Post('next')
  @HttpCode(200)
  @ApiOperation({ summary: 'Execute the next stage (step-by-step)' })
  @ApiResponse({ status: 200, description: 'Stage executed' })
  @ApiResponse({ status: 409, description: 'Cannot execute next stage' })
  async next() {
    try {
      const result = await this.service.next()
      if (result === null && this.service.getState().status === PipelineStatus.Completed) {
        return { message: 'All stages completed', state: this.service.getState() }
      }
      if (result === null) {
        return { message: 'No more stages', state: this.service.getState() }
      }
      return result
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException((err as Error).message, HttpStatus.CONFLICT)
    }
  }

  @Post('previous')
  @HttpCode(200)
  @ApiOperation({ summary: 'Step back to the previous stage' })
  @ApiResponse({ status: 200, description: 'Stepped back' })
  async previous() {
    const result = await this.service.previous()
    if (result === null) {
      return { message: 'At the beginning', state: this.service.getState() }
    }
    return result
  }

  @Post('replay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Replay all completed stages' })
  @ApiResponse({ status: 200, description: 'Replay completed' })
  @ApiResponse({ status: 409, description: 'No stages to replay' })
  async replay() {
    try {
      return await this.service.replay()
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.CONFLICT)
    }
  }

  @Post('reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset the pipeline to idle state' })
  @ApiResponse({ status: 200, description: 'Pipeline reset' })
  reset() {
    this.service.reset()
    return { message: 'Pipeline reset', state: this.service.getState() }
  }

  @Get('state')
  @ApiOperation({ summary: 'Get the current pipeline state' })
  @ApiResponse({ status: 200, description: 'Current pipeline state' })
  getState() {
    return this.service.getState()
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Get all stage snapshots' })
  @ApiResponse({ status: 200, description: 'Stage snapshots' })
  getSnapshots() {
    return this.service.getSnapshots()
  }

  @Get('input-status')
  @ApiOperation({ summary: 'Get pipeline input readiness and source' })
  getInputStatus() {
    return this.service.getInputStatus()
  }
}
