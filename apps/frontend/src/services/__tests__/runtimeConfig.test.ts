import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEMO_DATA_ENABLED } from '../runtimeConfig'

describe('frontend runtime configuration', () => {
  it('demo data is always disabled', () => {
    assert.equal(DEMO_DATA_ENABLED, false)
  })
})
