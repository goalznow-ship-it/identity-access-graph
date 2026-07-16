import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { IdentityCorrelationService, mergeFields, type CorrelationRecord } from '../correlation'
import { GraphConversionService, deterministicId } from '../graph-conversion'

function record(id: string, fields: Record<string, unknown>, datasetType = 'Users', sourceSystem = 'CUSTOM'): CorrelationRecord {
  return { recordId: id, fields, datasetType, sourceSystem, fileId: `file-${id}`, fileName: `${id}.csv`, sheetIndex: 0, sheetName: 'Sheet1', row: 1, validationStatus: 'VALID', raw: fields }
}

describe('identity correlation', () => {
  const service = new IdentityCorrelationService()

  for (const [label, field, value, method] of [
    ['GUID', 'objectGUID', 'ABC-123', 'objectGUID'],
    ['SID', 'sid', 'S-1-5-21-1', 'SID'],
    ['employee ID', 'employeeId', 'E100', 'employeeId'],
  ] as const) {
    it(`correlates by ${label}`, () => {
      const result = service.correlate('import', [record('1', { [field]: value }), record('2', { [field]: value })])
      assert.equal(result.groups.length, 1)
      assert.equal(result.groups[0].matchMethod, method)
      assert.equal(result.groups[0].matchedRecordIds.length, 2)
    })
  }

  it('normalizes email and username matches', () => {
    const email = service.correlate('import', [record('1', { email: 'USER@Example.com' }), record('2', { email: ' user@example.COM ' })])
    const username = service.correlate('import', [record('3', { username: 'DOMAIN\\Alice' }), record('4', { username: 'alice@example.com' })])
    assert.equal(email.groups.length, 1)
    assert.equal(username.groups.length, 1)
  })

  it('does not merge records when strong identifiers conflict', () => {
    const result = service.correlate('import', [
      record('1', { employeeId: 'E1', objectGUID: 'guid-1', sid: 'sid-1' }),
      record('2', { employeeId: 'E1', objectGUID: 'guid-2', sid: 'sid-2' }),
    ])
    assert.equal(result.groups.length, 2)
    assert.ok(result.groups.every((group) => group.confidence === 'CONFLICT'))
    assert.ok(result.groups.every((group) => group.manualReviewRequired))
  })

  it('uses source precedence while merging fields', () => {
    const merged = mergeFields([
      record('1', { displayName: 'Linux Name', email: 'linux@example.com' }, 'Users', 'LINUX'),
      record('2', { displayName: 'Directory Name' }, 'Users', 'ACTIVE_DIRECTORY'),
    ])
    assert.equal(merged.displayName, 'Directory Name')
    assert.equal(merged.email, 'linux@example.com')
  })
})

describe('graph conversion', () => {
  const correlationService = new IdentityCorrelationService()
  const conversionService = new GraphConversionService()

  it('generates deterministic IDs', () => {
    assert.equal(deterministicId('user', 'E1'), deterministicId('user', 'e1'))
    assert.notEqual(deterministicId('user', 'E1'), deterministicId('user', 'E2'))
  })

  it('converts users and groups and creates supported relationships', () => {
    const records = [
      record('user', { employeeId: 'E1', displayName: 'Alice', memberOf: 'Engineering' }),
      record('group', { groupName: 'Engineering', displayName: 'Engineering' }, 'Groups'),
    ]
    const result = conversionService.convert('import', records, correlationService.correlate('import', records))
    assert.equal(result.nodeTypeCounts.USER, 1)
    assert.equal(result.nodeTypeCounts.GROUP, 1)
    assert.equal(result.relationshipTypeCounts.MEMBER_OF, 1)
  })

  it('reports unresolved references without creating relationships', () => {
    const records = [record('user', { employeeId: 'E1', manager: 'missing-user' })]
    const result = conversionService.convert('import', records, correlationService.correlate('import', records))
    assert.equal(result.relationshipsCreated, 0)
    assert.equal(result.unresolvedReferences[0].field, 'manager')
  })

  it('enforces preview limits and prevents duplicate nodes', () => {
    const records = [
      record('1', { employeeId: 'E1', displayName: 'Alice' }),
      record('2', { employeeId: 'E1', email: 'alice@example.com' }),
      record('3', { employeeId: 'E2', displayName: 'Bob' }),
    ]
    const result = conversionService.convert('import', records, correlationService.correlate('import', records), 1, 0)
    assert.equal(result.nodesCreated, 2)
    assert.equal(result.duplicateNodesSkipped, 1)
    assert.equal(result.preview.nodes.length, 1)
    assert.equal(result.preview.links.length, 0)
    assert.equal(result.preview.pagination.truncated, true)
  })
})
