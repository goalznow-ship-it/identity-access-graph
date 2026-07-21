import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { AuthUser, PlatformRole, TokenClaims } from './auth.types'

interface StoredUser extends AuthUser { password: string }
const encode = (value: string | Buffer) => Buffer.from(value).toString('base64url')
const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left), b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

@Injectable()
export class AuthService {
  readonly enabled: boolean
  private readonly secret: string
  private readonly ttlSeconds: number
  private readonly users: StoredUser[]

  private readonly logger = new Logger(AuthService.name)
  constructor(config: ConfigService) {
    const nodeEnv = config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development'
    this.enabled = String(config.get('AUTH_ENABLED') ?? process.env.AUTH_ENABLED ?? (nodeEnv === 'production')).toLowerCase() === 'true'
    if (!this.enabled && nodeEnv === 'production') this.logger.warn('Authentication is DISABLED in production mode. All API requests will be accepted as full ADMIN. Set AUTH_ENABLED=true and configure JWT_SECRET and users.')
    this.secret = config.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET ?? ''
    this.ttlSeconds = Number(config.get('AUTH_TOKEN_TTL_SECONDS') ?? process.env.AUTH_TOKEN_TTL_SECONDS ?? 28800)
    if (!Number.isInteger(this.ttlSeconds) || this.ttlSeconds < 300 || this.ttlSeconds > 86400) throw new BadRequestException('AUTH_TOKEN_TTL_SECONDS must be between 300 and 86400')
    this.users = this.loadUsers(config)
    if (this.enabled && this.secret.length < 32) throw new BadRequestException('JWT_SECRET must contain at least 32 characters when authentication is enabled')
    if (this.enabled && this.users.length === 0) throw new BadRequestException('At least one authentication user must be configured')
  }

  login(username: unknown, password: unknown) {
    if (!this.enabled) return { accessToken: '', expiresIn: this.ttlSeconds, user: this.developmentUser() }
    if (typeof username !== 'string' || typeof password !== 'string') throw new UnauthorizedException('Invalid credentials')
    const stored = this.users.find((user) => user.username.toLowerCase() === username.trim().toLowerCase())
    if (!stored || !safeEqual(stored.password, password)) throw new UnauthorizedException('Invalid credentials')
    const { password: _password, ...user } = stored
    return { accessToken: this.sign(user), expiresIn: this.ttlSeconds, user }
  }

  authenticate(header?: string): AuthUser {
    if (!this.enabled) return this.developmentUser()
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required')
    const claims = this.verify(header.slice(7))
    return { id: claims.id, username: claims.username, displayName: claims.displayName, role: claims.role }
  }

  private sign(user: AuthUser) {
    const now = Math.floor(Date.now() / 1000)
    const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = encode(JSON.stringify({ ...user, iat: now, exp: now + this.ttlSeconds, iss: 'identity-access-graph' } satisfies TokenClaims))
    return `${header}.${payload}.${this.signature(`${header}.${payload}`)}`
  }

  private verify(token: string): TokenClaims {
    const [header, payload, signature, extra] = token.split('.')
    if (!header || !payload || !signature || extra || !safeEqual(this.signature(`${header}.${payload}`), signature)) throw new UnauthorizedException('Invalid bearer token')
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenClaims
      if (claims.iss !== 'identity-access-graph' || claims.exp <= Math.floor(Date.now() / 1000) || !Object.values(PlatformRole).includes(claims.role)) throw new Error('Invalid or expired authentication claims')
      return claims
    } catch { throw new UnauthorizedException('Invalid or expired bearer token') }
  }

  private signature(value: string) { return createHmac('sha256', this.secret).update(value).digest('base64url') }
  private developmentUser(): AuthUser { return { id: 'development-admin', username: 'developer', displayName: 'Development Administrator', role: PlatformRole.ADMIN } }
  private loadUsers(config: ConfigService): StoredUser[] {
    const raw = config.get<string>('AUTH_USERS_JSON') ?? process.env.AUTH_USERS_JSON
    if (raw) {
      let values: unknown
      try { values = JSON.parse(raw) } catch { throw new BadRequestException('AUTH_USERS_JSON must be valid JSON') }
      if (!Array.isArray(values)) throw new BadRequestException('AUTH_USERS_JSON must be an array')
      const users = values.map((value: any, index) => ({ id: String(value.id ?? `user-${index + 1}`), username: String(value.username ?? '').trim(), displayName: String(value.displayName ?? value.username ?? '').trim(), password: String(value.password ?? ''), role: String(value.role ?? PlatformRole.VIEWER) as PlatformRole }))
      if (users.some((user) => !user.username || !user.password || !Object.values(PlatformRole).includes(user.role))) throw new BadRequestException('Each authentication user requires username, password, and a valid role')
      if (new Set(users.map((user) => user.username.toLowerCase())).size !== users.length) throw new BadRequestException('Authentication usernames must be unique')
      return users
    }
    const username = config.get<string>('AUTH_ADMIN_USERNAME') ?? process.env.AUTH_ADMIN_USERNAME
    const password = config.get<string>('AUTH_ADMIN_PASSWORD') ?? process.env.AUTH_ADMIN_PASSWORD
    return username && password ? [{ id: 'admin', username, displayName: 'Platform Administrator', password, role: PlatformRole.ADMIN }] : []
  }
}
