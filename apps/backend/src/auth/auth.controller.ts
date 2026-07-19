import { Body, Controller, Get, Post } from '@nestjs/common'
import { CurrentUser, Public } from './auth.decorators'
import { AuthService } from './auth.service'
import type { AuthUser } from './auth.types'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Public() @Post('login') login(@Body() body: { username?: unknown; password?: unknown } = {}) { return this.auth.login(body.username, body.password) }
  @Get('me') me(@CurrentUser() user: AuthUser) { return { user, authenticationEnabled: this.auth.enabled } }
}
