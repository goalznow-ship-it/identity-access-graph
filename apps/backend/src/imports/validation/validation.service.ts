import { Injectable } from '@nestjs/common'
import type { ValidationIssue } from '../mapping/value-patterns'
import type { ColumnMapping } from '../mapping/mapping.service'
import { detectDuplicateValues } from './duplicate-detector'
import { validateReferences } from './reference-validator'
import {
  validateRequiredFields, validateDuplicateMappings,
  validateEmailField, validateIpField, validateHostnameField,
  validateUuidField, validateSidField, validateEmployeeIdField,
  validateStatusField, validateRiskLevelField, validateSourceSystemField,
} from './validation-rules'

export interface ValidationResult {
  importId: string
  fileId: string
  sheetIndex: number
  issues: ValidationIssue[]
  summary: {
    total: number
    info: number
    warning: number
    error: number
    critical: number
  }
}

@Injectable()
export class ValidationService {
  validateSheet(
    importId: string,
    fileId: string,
    file: string,
    sheetIndex: number,
    sheet: string,
    headers: string[],
    rows: Record<string, unknown>[],
    mappings: ColumnMapping[],
  ): ValidationResult {
    const allIssues: ValidationIssue[] = []

    const dupIssues = validateDuplicateMappings(
      mappings.filter((m) => !m.ignored).map((m) => ({ sourceColumn: m.sourceColumn, targetField: m.targetField })),
    )
    allIssues.push(...dupIssues)

    const requiredFields = mappings
      .filter((m) => m.required && !m.ignored)
      .map((m) => m.sourceColumn)
    allIssues.push(...validateRequiredFields(rows, requiredFields, file, sheet))

    for (const m of mappings) {
      if (m.ignored) continue
      if (m.duplicateTarget) continue

      switch (m.targetField) {
        case 'email':
          allIssues.push(...validateEmailField(rows, m.sourceColumn, file, sheet))
          break
        case 'ipAddress':
          allIssues.push(...validateIpField(rows, m.sourceColumn, file, sheet))
          break
        case 'hostname':
        case 'fqdn':
          allIssues.push(...validateHostnameField(rows, m.sourceColumn, file, sheet))
          break
        case 'objectGUID':
          allIssues.push(...validateUuidField(rows, m.sourceColumn, file, sheet))
          break
        case 'sid':
          allIssues.push(...validateSidField(rows, m.sourceColumn, file, sheet))
          break
        case 'employeeId':
          allIssues.push(...validateEmployeeIdField(rows, m.sourceColumn, file, sheet))
          break
        case 'status':
          allIssues.push(...validateStatusField(rows, m.sourceColumn, file, sheet))
          break
        case 'riskLevel':
          allIssues.push(...validateRiskLevelField(rows, m.sourceColumn, file, sheet))
          break
        case 'sourceSystem':
          allIssues.push(...validateSourceSystemField(rows, m.sourceColumn, file, sheet))
          break
      }
    }

    for (const m of mappings) {
      if (m.ignored || m.duplicateTarget) continue
      switch (m.targetField) {
        case 'objectGUID':
          allIssues.push(...detectDuplicateValues(rows, m.sourceColumn, file, sheet))
          break
        case 'sid':
          allIssues.push(...detectDuplicateValues(rows, m.sourceColumn, file, sheet))
          break
        case 'employeeId':
          allIssues.push(...detectDuplicateValues(rows, m.sourceColumn, file, sheet))
          break
      }
    }

    const rowKeyMap = new Map<string, number[]>()
    rows.forEach((row, i) => {
      const key = headers.map((h) => String(row[h] ?? '')).join('|')
      if (!rowKeyMap.has(key)) rowKeyMap.set(key, [])
      rowKeyMap.get(key)!.push(i + 1)
    })
    for (const [key, rowNumbers] of rowKeyMap) {
      if (rowNumbers.length > 1) {
        allIssues.push({
          code: 'DUP_ROW',
          severity: 'WARNING',
          message: `Duplicate row: "${key.substring(0, 80)}" appears ${rowNumbers.length} times`,
          file,
          sheet,
          row: rowNumbers[0],
          sourceColumn: '',
          targetField: '',
          rawValue: key.substring(0, 100),
          suggestedResolution: `Remove duplicate rows: ${rowNumbers.join(', ')}.`,
        })
      }
    }

    // Reference validation
    const employeeIdCol = mappings.find((m) => m.targetField === 'employeeId' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const samAccountNameCol = mappings.find((m) => m.targetField === 'samAccountName' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const userPrincipalNameCol = mappings.find((m) => m.targetField === 'userPrincipalName' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const emailCol = mappings.find((m) => m.targetField === 'email' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const groupNameCol = mappings.find((m) => m.targetField === 'groupName' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const departmentCol = mappings.find((m) => m.targetField === 'department' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const teamCol = mappings.find((m) => m.targetField === 'team' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const managerCol = mappings.find((m) => m.targetField === 'manager' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const parentGroupCol = mappings.find((m) => m.targetField === 'parentGroup' && !m.ignored && !m.duplicateTarget)?.sourceColumn
    const membersCol = mappings.find((m) => m.targetField === 'members' && !m.ignored && !m.duplicateTarget)?.sourceColumn

    const knownEmployees = new Set<string>()
    const knownGroups = new Set<string>()
    const knownDepartments = new Set<string>()
    const knownTeams = new Set<string>()

    rows.forEach((row) => {
      const value = (column?: string) => column ? String(row[column] ?? '').trim() : ''
      const empId = value(employeeIdCol)
      const sam = value(samAccountNameCol)
      const upn = value(userPrincipalNameCol)
      const email = value(emailCol)
      const gname = value(groupNameCol)
      const dept = value(departmentCol)
      const team = value(teamCol)
      if (empId) knownEmployees.add(empId)
      if (sam) knownEmployees.add(sam)
      if (upn) knownEmployees.add(upn)
      if (email) knownEmployees.add(email)
      if (gname) knownGroups.add(gname)
      if (dept) knownDepartments.add(dept)
      if (team) knownTeams.add(team)
    })

    if (managerCol) {
      allIssues.push(...validateReferences(rows, managerCol, 'employeeId', knownEmployees, file, sheet, 'manager'))
    }
    if (parentGroupCol) {
      allIssues.push(...validateReferences(rows, parentGroupCol, 'groupName', knownGroups, file, sheet, 'parent group'))
    }
    if (membersCol) {
      allIssues.push(...validateReferences(rows, membersCol, 'employeeId', knownEmployees, file, sheet, 'group member'))
    }
    if (departmentCol) {
      allIssues.push(...validateReferences(rows, departmentCol, 'department', knownDepartments, file, sheet, 'department'))
    }
    if (teamCol) {
      allIssues.push(...validateReferences(rows, teamCol, 'team', knownTeams, file, sheet, 'team'))
    }

    const summary = { total: 0, info: 0, warning: 0, error: 0, critical: 0 }
    for (const issue of allIssues) {
      summary.total++
      summary[issue.severity.toLowerCase() as keyof typeof summary]++
    }

    return { importId, fileId, sheetIndex, issues: allIssues, summary }
  }
}
