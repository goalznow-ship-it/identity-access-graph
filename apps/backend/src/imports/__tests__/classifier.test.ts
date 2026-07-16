import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { classify } from '../classification/classifier'

describe('Dataset Classifier', () => {
  it('should classify Users', () => {
    const result = classify(['firstName', 'lastName', 'email', 'department'])
    assert.equal(result.type, 'Users')
    assert.ok(result.confidence > 0)
    assert.ok(result.matchedPatterns.length > 0)
  })

  it('should classify Groups', () => {
    const result = classify(['groupName', 'groupType', 'scope'])
    assert.equal(result.type, 'Groups')
    assert.ok(result.confidence > 0)
  })

  it('should classify Group Memberships', () => {
    const result = classify(['username', 'groupName', 'memberOf'])
    assert.equal(result.type, 'Group Memberships')
    assert.ok(result.confidence > 0)
  })

  it('should classify Applications', () => {
    const result = classify(['applicationName', 'url', 'vendor', 'version'])
    assert.equal(result.type, 'Applications')
    assert.ok(result.confidence > 0)
  })

  it('should classify Databases', () => {
    const result = classify(['databaseName', 'engine', 'host', 'port'])
    assert.equal(result.type, 'Databases')
    assert.ok(result.confidence > 0)
  })

  it('should classify SSH Keys', () => {
    const result = classify(['sshKey', 'fingerprint', 'algorithm', 'owner'])
    assert.equal(result.type, 'SSH Keys')
    assert.ok(result.confidence > 0)
  })

  it('should classify Business Services', () => {
    const result = classify(['serviceName', 'sla', 'criticality', 'rto'])
    assert.equal(result.type, 'Business Services')
    assert.ok(result.confidence > 0)
  })

  it('should classify Service Accounts', () => {
    const result = classify(['serviceAccountName', 'principalName', 'managedBy'])
    assert.equal(result.type, 'Service Accounts')
    assert.ok(result.confidence > 0)
  })

  it('should classify Linux Hosts', () => {
    const result = classify(['hostname', 'ipAddress', 'environment', 'subnet'])
    assert.equal(result.type, 'Linux Hosts')
    assert.ok(result.confidence > 0)
  })

  it('should return Unknown for random headers', () => {
    const result = classify(['foo', 'bar', 'baz', 'qux'])
    assert.equal(result.type, 'Unknown')
    assert.equal(result.confidence, 0)
  })

  it('should handle single header column', () => {
    const result = classify(['email'])
    assert.equal(result.type, 'Users')
  })

  it('should handle mixed headers with best match', () => {
    const result = classify(['userName', 'hostname', 'command', 'runAs'])
    assert.ok(['Sudo Policies', 'Linux Hosts'].includes(result.type))
  })
})
