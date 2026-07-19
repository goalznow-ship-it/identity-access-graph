import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common'
import { CurrentUser, type AuthUser } from '../auth'
import { optionalInteger } from '../common/http-validation'
import { SettingsService } from './settings.service'
import type { WorkspaceSettings } from './settings.types'

@Controller('admin/settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}
  @Get() get() { return this.settings.get() }
  @Put() update(@Body() body: Partial<WorkspaceSettings>, @CurrentUser() user: AuthUser) { return this.settings.update(body, user.username) }
  @Post('reset') reset(@CurrentUser() user: AuthUser) { return this.settings.reset(user.username) }
  @Get('history') history(@Query('limit') limit?: string) { return this.settings.history(optionalInteger(limit, 'limit', { min: 1, max: 200 }) ?? 50) }
}
