import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MappingService } from '../mapping/mapping.service'
import { ValidationService } from '../validation/validation.service'
import { generateNormalizedPreview } from '../validation/normalized-preview'

describe('import mapping and validation', () => {
  const mappingService = new MappingService()

  it('applies overrides without mutating suggestions and flags every duplicate target', () => {
    const suggested = mappingService.suggestMappings(['mail', 'secondary_contact'], [
      { mail: 'A@Example.com', secondary_contact: 'b@example.com' },
    ], 'Users')
    const updated = mappingService.applyMappings(suggested, [
      { sourceColumn: 'secondary_contact', targetField: 'email', ignored: false },
    ])

    assert.equal(suggested[1].targetField, 'secondary_contact')
    assert.equal(updated.every((mapping) => mapping.duplicateTarget), true)
  })

  it('detects duplicate identifiers, invalid values, and unresolved references', () => {
    const mappings = mappingService.applyMappings(
      mappingService.suggestMappings(['employee_id', 'email', 'manager'], [], 'Users'),
      [
        { sourceColumn: 'employee_id', targetField: 'employeeId', ignored: false },
        { sourceColumn: 'email', targetField: 'email', ignored: false },
        { sourceColumn: 'manager', targetField: 'manager', ignored: false },
      ],
    )
    const result = new ValidationService().validateSheet(
      'import-1', 'file-1', 'users.csv', 0, 'Users',
      ['employee_id', 'email', 'manager'],
      [
        { employee_id: 'E1', email: 'bad-email', manager: 'E9' },
        { employee_id: 'E1', email: 'valid@example.com', manager: '' },
      ],
      mappings,
    )

    assert.ok(result.issues.some((issue) => issue.code === 'DUP_EMPLOYEE_ID'))
    assert.ok(result.issues.some((issue) => issue.code === 'INVALID_EMAIL'))
    assert.ok(result.issues.some((issue) => issue.code === 'UNRESOLVED_EMPLOYEEID'))
  })

  it('normalizes mapped values in the preview', () => {
    const mappings = mappingService.suggestMappings(['email', 'status'], [], 'Users')
    const [record] = generateNormalizedPreview([{ email: ' USER@Example.COM ', status: 'active' }], mappings)

    assert.equal(record.mapped.email, 'user@example.com')
    assert.equal(record.mapped.status, 'ACTIVE')
  })
})
