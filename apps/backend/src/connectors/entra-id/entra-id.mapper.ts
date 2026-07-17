import { createHash } from 'node:crypto'
import type { EntraGraphResult, EntraObjectType, NormalizedEntraObject } from './entra-id.types'

function deterministicId(type: string, ...parts: unknown[]): string {
  const key = parts.map(p => String(p ?? '')).join('|')
  return `entra:${type}:${createHash('sha256').update(key).digest('hex').slice(0, 24)}`
}

function val(obj: Record<string, unknown>, key: string): unknown {
  return obj[key] ?? obj[key.toLowerCase()]
}

function array(val: unknown): string[] {
  if (val == null) return []
  if (Array.isArray(val)) return val.map(String)
  return [String(val)]
}

const NODE_TYPE_MAP: Record<string, string> = {
  USER: 'USER',
  GROUP: 'GROUP',
  ADMINISTRATIVE_UNIT: 'ORGANIZATIONAL_UNIT',
  DIRECTORY_ROLE: 'ROLE',
  ROLE_ASSIGNMENT: 'PERMISSION',
  APPLICATION: 'APPLICATION',
  ENTERPRISE_APP: 'APPLICATION',
  SERVICE_PRINCIPAL: 'SERVICE_ACCOUNT',
  APP_ROLE: 'ROLE',
  APP_ROLE_ASSIGNMENT: 'PERMISSION',
  OAUTH_PERMISSION: 'PERMISSION',
  DEVICE: 'COMPUTER',
  REGISTERED_OWNER: 'USER',
  REGISTERED_USER: 'USER',
  CONDITIONAL_ACCESS_POLICY: 'PERMISSION',
}

export function normalizeEntraObject(raw: Record<string, unknown>, objectType: EntraObjectType, id: string): NormalizedEntraObject {
  const attrs: Record<string, unknown> = {
    ...raw,
    id,
    objectType,
    userPrincipalName: val(raw, 'userPrincipalName') ?? val(raw, 'upn'),
    displayName: val(raw, 'displayName'),
    mail: val(raw, 'mail') ?? val(raw, 'email'),
    givenName: val(raw, 'givenName'),
    surname: val(raw, 'surname'),
    jobTitle: val(raw, 'jobTitle'),
    department: val(raw, 'department'),
    employeeId: val(raw, 'employeeId'),
    userType: val(raw, 'userType'),
    accountEnabled: val(raw, 'accountEnabled'),
    securityIdentifier: val(raw, 'securityIdentifier') ?? val(raw, 'onPremisesSecurityIdentifier'),
    onPremisesSamAccountName: val(raw, 'onPremisesSamAccountName'),
    onPremisesUserPrincipalName: val(raw, 'onPremisesUserPrincipalName'),
    businessPhones: array(val(raw, 'businessPhones')),
    mobilePhone: val(raw, 'mobilePhone'),
    officeLocation: val(raw, 'officeLocation'),
    preferredLanguage: val(raw, 'preferredLanguage'),
    companyName: val(raw, 'companyName'),
    groupTypes: array(val(raw, 'groupTypes')),
    securityEnabled: val(raw, 'securityEnabled'),
    mailEnabled: val(raw, 'mailEnabled'),
    visibility: val(raw, 'visibility'),
    signInActivity: val(raw, 'signInActivity'),
    createdDateTime: val(raw, 'createdDateTime'),
    deletedDateTime: val(raw, 'deletedDateTime'),
    appId: val(raw, 'appId'),
    publisherName: val(raw, 'publisherName'),
    servicePrincipalType: val(raw, 'servicePrincipalType'),
    appOwnerOrganizationId: val(raw, 'appOwnerOrganizationId'),
    isEnabled: val(raw, 'isEnabled'),
    isBuiltIn: val(raw, 'isBuiltIn'),
    roleTemplateId: val(raw, 'roleTemplateId'),
    operatingSystem: val(raw, 'operatingSystem'),
    operatingSystemVersion: val(raw, 'operatingSystemVersion'),
    isManaged: val(raw, 'isManaged'),
    trustType: val(raw, 'trustType'),
    profileType: val(raw, 'profileType'),
    members: array(val(raw, 'members')).map(m => typeof m === 'object' ? (m as any).id ?? String(m) : String(m)),
    owners: array(val(raw, 'owners')).map(m => typeof m === 'object' ? (m as any).id ?? String(m) : String(m)),
    memberOf: array(val(raw, 'memberOf')).map(m => typeof m === 'object' ? (m as any).id ?? String(m) : String(m)),
    transitiveMemberOf: array(val(raw, 'transitiveMemberOf')).map(m => typeof m === 'object' ? (m as any).id ?? String(m) : String(m)),
    registeredOwners: array(val(raw, 'registeredOwners')).map(m => typeof m === 'object' ? (m as any).id ?? String(m) : String(m)),
    registeredUsers: array(val(raw, 'registeredUsers')).map(m => typeof m === 'object' ? (m as any).id ?? String(m) : String(m)),
    appRoles: array(val(raw, 'appRoles')),
    resourceSpecificApplicationPermissions: array(val(raw, 'resourceSpecificApplicationPermissions')),
    delegatedPermissions: array(val(raw, 'delegatedPermissions')),
    oauth2PermissionScopes: array(val(raw, 'oauth2PermissionScopes')),
    requiredResourceAccess: array(val(raw, 'requiredResourceAccess')),
    keyCredentials: array(val(raw, 'keyCredentials')),
    passwordCredentials: array(val(raw, 'passwordCredentials')),
  }

  const recordId = deterministicId(objectType, id)
  return { recordId, objectType, id, attributes: attrs }
}

export function mapEntraGraph(
  objects: NormalizedEntraObject[],
  connectorId: string,
  syncRunId: string,
  extractedAt = new Date().toISOString(),
): EntraGraphResult {
  const idNodeMap = new Map<string, string>()
  for (const obj of objects) {
    idNodeMap.set(obj.id, obj.recordId)
  }

  const nodes = objects.map(obj => ({
    id: obj.recordId,
    displayName: String(obj.attributes.displayName ?? obj.attributes.userPrincipalName ?? obj.attributes.appId ?? obj.id),
    nodeType: NODE_TYPE_MAP[obj.objectType] ?? obj.objectType,
    sourceSystem: 'ENTRA_ID',
    sourceId: obj.id,
    riskLevel: 'NONE' as const,
    properties: { ...obj.attributes, connectorId, syncRunId, extractedAt },
  }))

  const relationships: any[] = []
  const addRel = (type: string, source: string | undefined, target: string | undefined, props: Record<string, unknown> = {}) => {
    if (source && target && source !== target) {
      relationships.push({
        id: deterministicId('rel', type, source, target),
        source, target, relationshipType: type, sourceSystem: 'ENTRA_ID',
        properties: { connectorId, syncRunId, direct: true, ...props },
      })
    }
  }

  for (const obj of objects) {
    const source = obj.recordId

    for (const mid of obj.attributes.members as string[]) {
      addRel('MEMBER_OF', idNodeMap.get(mid), source)
    }
    for (const mid of obj.attributes.memberOf as string[]) {
      addRel('MEMBER_OF', source, idNodeMap.get(mid))
    }
    for (const oid of obj.attributes.owners as string[]) {
      addRel('OWNS', idNodeMap.get(oid), source)
    }
    for (const oid of obj.attributes.registeredOwners as string[]) {
      addRel('OWNS', idNodeMap.get(oid), source)
    }
    for (const uid of obj.attributes.registeredUsers as string[]) {
      addRel('REGISTERED_DEVICE', idNodeMap.get(uid), source)
    }

    if (obj.objectType === 'DIRECTORY_ROLE') {
      addRel('HAS_ROLE', source, source)
    }
    if (obj.objectType === 'ROLE_ASSIGNMENT') {
      const principalId = String(obj.attributes.principalId ?? '')
      const roleDefId = String(obj.attributes.roleDefinitionId ?? '')
      addRel('ASSIGNED_TO', idNodeMap.get(principalId), source)
      addRel('HAS_ROLE', source, idNodeMap.get(roleDefId))
    }
    if (obj.objectType === 'APP_ROLE_ASSIGNMENT') {
      const principalId = String(obj.attributes.principalId ?? '')
      const resourceId = String(obj.attributes.resourceId ?? '')
      addRel('HAS_APP_ROLE', idNodeMap.get(principalId), source)
      addRel('GRANTS', source, idNodeMap.get(resourceId))
    }
    if (obj.objectType === 'OAUTH_PERMISSION') {
      addRel('CONSENTS_TO', source, source)
    }
    if (obj.objectType === 'APPLICATION' || obj.objectType === 'ENTERPRISE_APP') {
      addRel('USES_APPLICATION', source, source)
    }
    if (obj.objectType === 'DEVICE') {
      addRel('REGISTERED_DEVICE', source, source)
    }
    if (obj.objectType === 'USER' || obj.objectType === 'SERVICE_PRINCIPAL') {
      addRel('EXISTS_IN', source, source)
    }
    if (obj.objectType === 'SERVICE_PRINCIPAL') {
      const appId = String(obj.attributes.appId ?? '')
      const appNode = objects.find(o => o.attributes.appId === appId && (o.objectType === 'APPLICATION' || o.objectType === 'ENTERPRISE_APP'))
      if (appNode) addRel('USES_APPLICATION', source, appNode.recordId)
    }

    const userPrincipalName = String(obj.attributes.userPrincipalName ?? '')
    const onPremUpn = String(obj.attributes.onPremisesUserPrincipalName ?? '')
    const onPremSam = String(obj.attributes.onPremisesSamAccountName ?? '')

    if (onPremUpn || onPremSam) {
      addRel('AUTHENTICATES_TO', source, source, { onPremUpn, onPremSam })
    }
  }

  return { nodes, relationships, warnings: [] }
}
