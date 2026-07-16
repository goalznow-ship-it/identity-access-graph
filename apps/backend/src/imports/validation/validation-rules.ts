import {
  isValidEmail, isValidIp, isValidHostname, isValidUuid,
  isValidSid, isValidEmployeeId, isValidStatus, isValidRiskLevel, isValidSourceSystem,
  type ValidationIssue,
} from '../mapping/value-patterns'

export function validateRequiredFields(
  rows: Record<string, unknown>[],
  requiredColumns: string[],
  file: string,
  sheet: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const col of requiredColumns) {
    rows.forEach((row, i) => {
      const val = String(row[col] ?? '').trim()
      if (!val) {
        issues.push({
          code: 'MISSING_REQUIRED',
          severity: 'ERROR',
          message: `Required field "${col}" is empty`,
          file,
          sheet,
          row: i + 1,
          sourceColumn: col,
          targetField: col,
          rawValue: '',
          suggestedResolution: `Provide a value for the "${col}" field.`,
        })
      }
    })
  }
  return issues
}

export function validateDuplicateMappings(
  mappings: { sourceColumn: string; targetField: string }[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Map<string, string[]>()

  for (const m of mappings) {
    if (m.targetField === 'id' || m.targetField === 'ignored') continue
    if (!seen.has(m.targetField)) seen.set(m.targetField, [])
    seen.get(m.targetField)!.push(m.sourceColumn)
  }

  for (const [field, cols] of seen) {
    if (cols.length > 1) {
      issues.push({
        code: 'DUPLICATE_MAPPING',
        severity: 'WARNING',
        message: `Multiple columns map to "${field}": ${cols.join(', ')}`,
        file: '',
        sheet: '',
        row: 0,
        sourceColumn: cols.join(', '),
        targetField: field,
        rawValue: cols.join(', '),
        suggestedResolution: `Choose one column to map to "${field}" and ignore the others.`,
      })
    }
  }

  return issues
}

export function validateEmailField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'email', isValidEmail, 'a valid email address (e.g., user@domain.com)')
}

export function validateIpField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'ipAddress', isValidIp, 'a valid IP address (e.g., 192.168.1.1)')
}

export function validateHostnameField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'hostname', isValidHostname, 'a valid hostname (e.g., server-01.domain.com)')
}

export function validateUuidField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'objectGUID', isValidUuid, 'a valid UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)')
}

export function validateSidField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'sid', isValidSid, 'a valid SID (e.g., S-1-5-21-...)')
}

export function validateEmployeeIdField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'employeeId', isValidEmployeeId, 'a valid employee ID')
}

export function validateStatusField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'status', isValidStatus, 'ACTIVE, INACTIVE, DISABLED, LOCKED, DELETED, or PENDING')
}

export function validateRiskLevelField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'riskLevel', isValidRiskLevel, 'NONE, LOW, MEDIUM, HIGH, or CRITICAL')
}

export function validateSourceSystemField(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
): ValidationIssue[] {
  return validatePattern(rows, column, file, sheet, 'sourceSystem', isValidSourceSystem, 'ACTIVE_DIRECTORY, FREE_IPA, LINUX, etc.')
}

function validatePattern(
  rows: Record<string, unknown>[],
  column: string,
  file: string,
  sheet: string,
  targetField: string,
  validator: (v: string) => boolean,
  expectedFormat: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  rows.forEach((row, i) => {
    const val = String(row[column] ?? '').trim()
    if (!val) return
    if (!validator(val)) {
      issues.push({
        code: `INVALID_${targetField.toUpperCase()}`,
        severity: 'WARNING',
        message: `Invalid ${targetField}: "${val}" is not ${expectedFormat}`,
        file,
        sheet,
        row: i + 1,
        sourceColumn: column,
        targetField,
        rawValue: val,
        suggestedResolution: `Correct the value to ${expectedFormat}.`,
      })
    }
  })
  return issues
}
