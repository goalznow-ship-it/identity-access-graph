import { createHash } from 'node:crypto'
import type { LdapEntry } from '../ldap'
import type { FreeipaGraphResult, FreeipaObjectType, NormalizedFreeipaObject } from './freeipa.types'

const array = (value: unknown): string[] =>
  value == null ? [] : Array.isArray(value) ? value.map(String) : [String(value)]

const val = (entry: LdapEntry, key: string): unknown =>
  entry.attributes[key] ?? entry.attributes[Object.keys(entry.attributes).find(k => k.toLowerCase() === key.toLowerCase()) ?? '']

const stringVal = (entry: LdapEntry, key: string): string =>
  String(val(entry, key) ?? '')

export const normalizeDn = (dn: string): string =>
  dn.split(',').map(p => p.trim()).join(',').toLowerCase()

function classify(entry: LdapEntry): FreeipaObjectType {
  const classes = array(val(entry, 'objectClass')).map(c => c.toLowerCase())
  if (classes.includes('ipasudorule')) return 'SUDO_RULE'
  if (classes.includes('ipasudocmd')) return 'SUDO_COMMAND'
  if (classes.includes('ipahbacrule')) return 'HBAC_RULE'
  if (classes.includes('ipahostgroup')) return 'HOST_GROUP'
  if (classes.includes('ipahost')) return 'HOST'
  if (classes.includes('iparole')) return 'ROLE'
  if (classes.includes('ipaprivilege')) return 'PRIVILEGE'
  if (classes.includes('ipapermission')) return 'PERMISSION'
  if (classes.includes('ipanetgroup')) return 'NETGROUP'
  if (classes.includes('ipaservice')) return 'SERVICE'
  if (classes.includes('posixgroup')) return 'GROUP'
  if (classes.includes('posixaccount')) return 'USER'
  return 'USER'
}

function timestampToIso(input: unknown): string | undefined {
  if (!input) return undefined
  const text = String(input)
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\.\d+)?Z?$/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
  }
  try {
    return new Date(text).toISOString()
  } catch {
    return undefined
  }
}

function normalizeSshKey(input: unknown): string[] {
  return array(input).map(key => key.trim()).filter(k => k.length > 0)
}

export function normalizeFreeipaEntry(entry: LdapEntry): NormalizedFreeipaObject {
  const objectType = classify(entry)
  const ipaUniqueID = stringVal(entry, 'ipaUniqueID')
  const dn = normalizeDn(entry.dn)
  const id = ipaUniqueID || `dn:${createHash('sha256').update(dn).digest('hex').slice(0, 24)}`
  const attributes: Record<string, unknown> = {
    ...entry.attributes,
    dn,
    ipaUniqueID,
    memberOf: array(val(entry, 'memberOf')),
    member: array(val(entry, 'member')),
    memberUser: array(val(entry, 'memberUser')),
    memberHost: array(val(entry, 'memberHost')),
    memberAllowCmd: array(val(entry, 'memberAllowCmd')),
    memberDenyCmd: array(val(entry, 'memberDenyCmd')),
    memberService: array(val(entry, 'memberService')),
    sshPublicKey: normalizeSshKey(val(entry, 'sshPublicKey')),
    manager: stringVal(entry, 'manager'),
    managedBy: stringVal(entry, 'managedBy'),
    ipaEnabledFlag: stringVal(entry, 'ipaEnabledFlag') !== 'FALSE',
    hostCategory: stringVal(entry, 'hostCategory'),
    userCategory: stringVal(entry, 'userCategory'),
    serviceCategory: stringVal(entry, 'serviceCategory'),
    accessRuleType: stringVal(entry, 'accessRuleType'),
    uidNumber: Number(val(entry, 'uidNumber')) || undefined,
    gidNumber: Number(val(entry, 'gidNumber')) || undefined,
    nsAccountLock: stringVal(entry, 'nsAccountLock') === 'TRUE',
    krbPrincipalName: stringVal(entry, 'krbPrincipalName'),
    createTimestamp: timestampToIso(val(entry, 'createTimestamp')),
    modifyTimestamp: timestampToIso(val(entry, 'modifyTimestamp')),
  }
  return { recordId: id, objectType, dn, ipaUniqueID, attributes, raw: entry }
}

export function mapFreeipaGraph(
  objects: NormalizedFreeipaObject[],
  connectorId: string,
  syncRunId: string,
  extractedAt = new Date().toISOString(),
): FreeipaGraphResult {
  const nodeIdMap = new Map<string, string>()
  const dnIdMap = new Map<string, string>()
  for (const obj of objects) {
    const id = `ipa:${obj.ipaUniqueID ?? createHash('sha256').update(obj.dn).digest('hex').slice(0, 24)}`
    nodeIdMap.set(obj.recordId, id)
    dnIdMap.set(obj.dn, id)
  }

  const resolve = (dnOrId: string): string | undefined => {
    const normalized = normalizeDn(dnOrId)
    return dnIdMap.get(normalized) ?? dnIdMap.get(`cn=${normalized}`)
  }

  const nodeTypeMap: Record<string, string> = {
    USER: 'USER', GROUP: 'GROUP', HOST: 'HOST', HOST_GROUP: 'GROUP',
    ROLE: 'ROLE', PERMISSION: 'PERMISSION', PRIVILEGE: 'ROLE',
    SUDO_RULE: 'SUDO_POLICY', SUDO_COMMAND: 'PERMISSION',
    HBAC_RULE: 'PERMISSION', SERVICE: 'SERVICE_ACCOUNT',
    SSH_PUBLIC_KEY: 'SSH_KEY', NETGROUP: 'GROUP',
  }

  const nodes = objects.map(obj => ({
    id: nodeIdMap.get(obj.recordId)!,
    displayName: String(obj.attributes.cn ?? obj.attributes.uid ?? obj.attributes.fqdn ?? obj.dn),
    nodeType: nodeTypeMap[obj.objectType] ?? obj.objectType,
    sourceSystem: 'FREEIPA',
    sourceId: obj.ipaUniqueID ?? obj.dn,
    riskLevel: 'NONE' as const,
    properties: { ...obj.attributes, connectorId, syncRunId, sourceDn: obj.dn, extractedAt, rawMetadata: { dn: obj.raw.dn } },
  }))

  const relationships: any[] = []
  const addRel = (type: string, source: string | undefined, target: string | undefined, props: Record<string, unknown> = {}) => {
    if (source && target && source !== target) {
      relationships.push({
        id: `ipa-rel:${createHash('sha256').update(`${type}|${source}|${target}`).digest('hex').slice(0, 24)}`,
        source, target, relationshipType: type, sourceSystem: 'FREEIPA',
        properties: { connectorId, syncRunId, direct: true, inherited: false, ...props },
      })
    }
  }

  for (const obj of objects) {
    const source = nodeIdMap.get(obj.recordId)
    for (const dn of obj.attributes.memberOf as string[]) {
      addRel('MEMBER_OF', source, resolve(dn))
    }
    for (const dn of obj.attributes.member as string[]) {
      addRel('MEMBER_OF', resolve(dn), source)
    }
    for (const dn of obj.attributes.memberUser as string[]) {
      addRel('MEMBER_OF', resolve(dn), source)
    }
    for (const dn of obj.attributes.memberHost as string[]) {
      addRel('MEMBER_OF', resolve(dn), source)
    }
    for (const dn of obj.attributes.memberAllowCmd as string[]) {
      addRel('ALLOWS', source, resolve(dn))
    }
    for (const dn of obj.attributes.memberDenyCmd as string[]) {
      addRel('DENIES', source, resolve(dn))
    }
    for (const dn of obj.attributes.memberService as string[]) {
      addRel('AUTHENTICATES_TO', source, resolve(dn))
    }
    const manager = stringVal(obj.raw, 'manager')
    if (manager) addRel('REPORTS_TO', source, resolve(manager))
    const managedBy = stringVal(obj.raw, 'managedBy')
    if (managedBy) addRel('MANAGED_BY', source, resolve(managedBy))
    if (obj.objectType === 'SUDO_RULE') {
      if (obj.attributes.hostCategory === 'all') addRel('HAS_SUDO_POLICY', source, source, { category: 'all' })
      if (obj.attributes.userCategory === 'all') addRel('HAS_SUDO_POLICY', source, source, { category: 'all' })
    }
    if (obj.objectType === 'HOST') {
      addRel('RUNS_ON', source, source)
    }
    if (obj.objectType === 'USER' || obj.objectType === 'SERVICE') {
      addRel('EXISTS_IN', source, source)
    }
    const sshKeys = obj.attributes.sshPublicKey as string[] | undefined
    if (sshKeys && sshKeys.length > 0) {
      for (const key of sshKeys) {
        const keyId = `ssh:${createHash('sha256').update(key).digest('hex').slice(0, 24)}`
        addRel('HAS_SSH_KEY', source, keyId, { fingerprint: keyId })
      }
    }
  }

  return { nodes, relationships, warnings: [] }
}
