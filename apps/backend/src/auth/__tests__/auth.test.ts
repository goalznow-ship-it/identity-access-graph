import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '../auth.guard'
import { AuthService } from '../auth.service'
import { PlatformRole } from '../auth.types'

const secret = 'a-production-quality-secret-that-is-long-enough'
const users = JSON.stringify([
  { id: 'viewer-1', username: 'viewer', displayName: 'Read Only', password: 'viewer-password', role: 'VIEWER' },
  { id: 'analyst-1', username: 'analyst', displayName: 'Security Analyst', password: 'analyst-password', role: 'ANALYST' },
])
const service = () => new AuthService(new ConfigService({ AUTH_ENABLED: 'true', JWT_SECRET: secret, AUTH_USERS_JSON: users, AUTH_TOKEN_TTL_SECONDS: '3600' }))

describe('platform authentication and RBAC', () => {
  it('issues signed tokens without exposing credentials and resolves the current user', () => {
    const auth = service(), login = auth.login('viewer', 'viewer-password')
    assert.equal(login.accessToken.split('.').length, 3)
    assert.equal((login.user as any).password, undefined)
    assert.deepEqual(auth.authenticate(`Bearer ${login.accessToken}`), { id: 'viewer-1', username: 'viewer', displayName: 'Read Only', role: PlatformRole.VIEWER })
  })

  it('rejects invalid credentials, tampered tokens, and unsafe enabled configuration', () => {
    const auth = service(), login = auth.login('viewer', 'viewer-password')
    assert.throws(() => auth.login('viewer', 'wrong'), /Invalid credentials/)
    assert.throws(() => auth.authenticate(`Bearer ${login.accessToken}x`), /Invalid bearer token/)
    assert.throws(() => new AuthService(new ConfigService({ AUTH_ENABLED: 'true', JWT_SECRET: 'short', AUTH_USERS_JSON: users })), /32 characters/)
  })

  it('preserves explicit development compatibility mode', () => {
    const auth = new AuthService(new ConfigService({ AUTH_ENABLED: 'false' }))
    assert.equal(auth.authenticate().role, PlatformRole.ADMIN)
    assert.equal(auth.login(undefined, undefined).user.username, 'developer')
  })

  it('allows authenticated reads while protecting mutations by default', () => {
    const auth = service(), token = auth.login('viewer', 'viewer-password').accessToken
    const guard = new AuthGuard(new Reflector(), auth)
    const context = (method: string) => ({
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ method, headers: { authorization: `Bearer ${token}` } }) }),
    }) as any
    assert.equal(guard.canActivate(context('GET')), true)
    assert.throws(() => guard.canActivate(context('POST')), /Insufficient platform role/)
  })
})
