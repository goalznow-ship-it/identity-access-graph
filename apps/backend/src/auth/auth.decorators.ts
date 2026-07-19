import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import type { AuthUser } from './auth.types'
import { PlatformRole } from './auth.types'

export const PUBLIC_ROUTE = 'auth:public'
export const REQUIRED_ROLES = 'auth:roles'
export const Public = () => SetMetadata(PUBLIC_ROUTE, true)
export const Roles = (...roles: PlatformRole[]) => SetMetadata(REQUIRED_ROLES, roles)
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest().user)
