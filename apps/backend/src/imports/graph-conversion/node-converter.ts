import type { CorrelationRecord } from '../correlation'
import type { CorrelationResult } from '../correlation/identity-correlation.service'
import { deterministicId } from './deterministic-id'

export interface ImportedGraphNode {
  id: string
  displayName: string
  nodeType: string
  sourceSystem: string
  sourceId?: string
  riskLevel: string
  properties: Record<string, unknown>
}

const NODE_TYPES: Record<string, string> = {
  Users: 'USER', Groups: 'GROUP', Departments: 'DEPARTMENT', Teams: 'TEAM', Roles: 'ROLE', Permissions: 'PERMISSION',
  Computers: 'COMPUTER', 'Linux Hosts': 'HOST', 'Linux Users': 'LINUX_USER', 'Linux Groups': 'LINUX_GROUP',
  'Sudo Policies': 'SUDO_POLICY', 'SSH Keys': 'SSH_KEY', Applications: 'APPLICATION', Databases: 'DATABASE',
  'Business Services': 'BUSINESS_SERVICE', 'Service Accounts': 'SERVICE_ACCOUNT', 'Organizational Units': 'ORGANIZATIONAL_UNIT', Domains: 'DOMAIN',
}

const KEY_FIELDS: Record<string, string[]> = {
  USER: ['objectGUID', 'sid', 'employeeId', 'email', 'username'], GROUP: ['objectGUID', 'sid', 'distinguishedName', 'groupName'],
  DEPARTMENT: ['department', 'displayName'], TEAM: ['team', 'displayName'], ROLE: ['roleName', 'displayName'], PERMISSION: ['permissionName', 'displayName'],
  COMPUTER: ['objectGUID', 'sid', 'hostname', 'fqdn'], HOST: ['hostname', 'fqdn'], LINUX_USER: ['uid', 'username'], LINUX_GROUP: ['gid', 'groupName'],
  SUDO_POLICY: ['sudoPolicy', 'displayName'], SSH_KEY: ['fingerprint', 'sshPublicKey'], APPLICATION: ['applicationName'], DATABASE: ['databaseName'],
  BUSINESS_SERVICE: ['businessService'], SERVICE_ACCOUNT: ['userPrincipalName', 'username'], ORGANIZATIONAL_UNIT: ['distinguishedName'], DOMAIN: ['domain'],
}

function first(fields: Record<string, unknown>, keys: string[]): unknown {
  return keys.map((key) => fields[key]).find((value) => value !== undefined && value !== '')
}

export function convertNode(importId: string, record: CorrelationRecord, correlation: CorrelationResult, timestamp: string): ImportedGraphNode | null {
  const nodeType = NODE_TYPES[record.datasetType ?? '']
  if (!nodeType) return null
  const correlatedId = nodeType === 'USER' || nodeType === 'SERVICE_ACCOUNT' ? correlation.recordToCanonical[record.recordId] : undefined
  const correlationGroup = correlatedId
    ? correlation.groups.find((group) => group.canonicalIdentityId === correlatedId)
    : undefined
  // A canonical identity must contain the correlation result, not whichever source
  // record happened to be encountered first during conversion.
  const fields = correlationGroup?.mergedFields ?? record.fields
  const naturalKey = first(fields, KEY_FIELDS[nodeType] ?? []) ?? record.recordId
  const id = correlatedId ?? deterministicId(nodeType, naturalKey)
  const displayName = String(first(fields, ['displayName', 'groupName', 'department', 'team', 'applicationName', 'databaseName', 'businessService', 'hostname', 'username', 'email', 'distinguishedName']) ?? id)
  return {
    id,
    displayName,
    nodeType,
    sourceSystem: String(fields.sourceSystem ?? record.sourceSystem ?? 'CUSTOM').toUpperCase(),
    sourceId: String(first(fields, ['sourceId', 'externalId', 'objectGUID', 'sid']) ?? record.recordId),
    riskLevel: String(fields.riskLevel ?? 'NONE').toUpperCase(),
    properties: {
      ...fields,
      importSessionId: importId,
      sourceFile: record.fileName,
      sourceSheet: record.sheetName,
      rawRecordReference: { fileId: record.fileId, sheetIndex: record.sheetIndex, row: record.row },
      rawRecord: record.raw,
      sourceSystems: correlationGroup?.sourceSystems ?? [String(fields.sourceSystem ?? record.sourceSystem ?? 'CUSTOM').toUpperCase()],
      sourceRecordIds: correlationGroup?.matchedRecordIds ?? [record.recordId],
      correlationConfidence: correlationGroup?.confidence ?? 'LOW',
      validationStatus: record.validationStatus ?? 'VALID',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  }
}
