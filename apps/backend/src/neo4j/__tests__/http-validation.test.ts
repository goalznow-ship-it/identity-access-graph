import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BadRequestException } from '@nestjs/common'
import { optionalBoolean, optionalEnum, optionalInteger } from '../../common/http-validation'
import { AttackPathController } from '../../attack-path/attack-path.controller'
import { ConnectorsController } from '../../connectors/connectors.controller'
import { NotificationsController } from '../../notifications/notifications.controller'
import { RiskController } from '../../risk/risk.controller'
import { SettingsController } from '../../settings/settings.controller'

describe('public API query validation', () => {
  it('strictly parses integers, booleans, and enumerations', () => {
    assert.equal(optionalInteger('12', 'limit', { min: 1, max: 20 }), 12)
    assert.equal(optionalBoolean('false', 'enabled'), false)
    assert.equal(optionalEnum('ASC', 'direction', ['ASC', 'DESC']), 'ASC')
    for (const action of [
      () => optionalInteger('1.5', 'limit'),
      () => optionalInteger('-1', 'limit'),
      () => optionalBoolean('yes', 'enabled'),
      () => optionalEnum('SIDEWAYS', 'direction', ['ASC', 'DESC']),
    ]) assert.throws(action, BadRequestException)
  })

  it('rejects malformed attack-path query options', () => {
    const controller = new AttackPathController({} as any)
    assert.throws(() => controller.from('user-1', { directed: 'yes' }), BadRequestException)
    assert.throws(() => controller.to('admin-1', { maxDepth: '100' }), BadRequestException)
    assert.throws(() => controller.targets('redis'), BadRequestException)
  })

  it('rejects malformed operational list queries', () => {
    assert.throws(() => new NotificationsController({} as any).list({ unread: '1' }), BadRequestException)
    assert.throws(() => new RiskController({} as any).list({ severity: 'EXTREME' }), BadRequestException)
    assert.throws(() => new ConnectorsController({} as any).preview('connector-1', '0'), BadRequestException)
    assert.throws(() => new SettingsController({} as any).history('201'), BadRequestException)
  })
})
