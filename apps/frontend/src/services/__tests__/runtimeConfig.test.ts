import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveDemoDataEnabled } from '../runtimeConfig'

describe('frontend runtime configuration', () => {
  it('requires an explicit demo-data flag outside development', () => {
    assert.equal(resolveDemoDataEnabled(undefined, false), false)
    assert.equal(resolveDemoDataEnabled(undefined, true), true)
    assert.equal(resolveDemoDataEnabled('TRUE', false), true)
    assert.equal(resolveDemoDataEnabled('false', true), false)
  })
})
