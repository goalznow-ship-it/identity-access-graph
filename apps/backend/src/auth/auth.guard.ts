import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthService } from './auth.service'
import { PUBLIC_ROUTE, REQUIRED_ROLES } from './auth.decorators'
import { PlatformRole } from './auth.types'

const rank = { [PlatformRole.VIEWER]: 1, [PlatformRole.ANALYST]: 2, [PlatformRole.ADMIN]: 3 }
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private auth: AuthService) {}
  canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true
    const request = context.switchToHttp().getRequest()
    const user = this.auth.authenticate(request.headers.authorization)
    request.user = user
    const roles = this.reflector.getAllAndOverride<PlatformRole[]>(REQUIRED_ROLES, [context.getHandler(), context.getClass()]) ?? [request.method === 'GET' || request.method === 'HEAD' ? PlatformRole.VIEWER : PlatformRole.ADMIN]
    if (!roles.some((role) => rank[user.role] >= rank[role])) throw new ForbiddenException('Insufficient platform role')
    return true
  }
}
