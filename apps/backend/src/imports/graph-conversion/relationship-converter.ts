import type { CorrelationRecord } from '../correlation'
import { deterministicId } from './deterministic-id'
import type { ImportedGraphNode } from './node-converter'
import { ReferenceResolver } from './reference-resolver'

export interface ImportedGraphRelationship {
  id: string
  source: string
  target: string
  relationshipType: string
  sourceSystem: string
  properties: Record<string, unknown>
}

export interface UnresolvedReference { recordId: string; field: string; value: string; relationshipType: string; reason: string }

const RULES: { fields: string[]; type: string }[] = [
  { fields: ['memberOf', 'groupName', 'linuxGroups'], type: 'MEMBER_OF' },
  { fields: ['department', 'team'], type: 'BELONGS_TO' },
  { fields: ['manager'], type: 'REPORTS_TO' },
  { fields: ['role', 'roleName'], type: 'HAS_ROLE' },
  { fields: ['permission', 'permissionName'], type: 'GRANTS' },
  { fields: ['accessTo'], type: 'HAS_ACCESS_TO' },
  { fields: ['domain', 'ou'], type: 'EXISTS_IN' },
  { fields: ['site', 'location'], type: 'LOCATED_IN' },
  { fields: ['uses'], type: 'USES' },
  { fields: ['host', 'hostname', 'runsOn'], type: 'RUNS_ON' },
  { fields: ['businessService'], type: 'SUPPORTS' },
  { fields: ['authenticatesTo'], type: 'AUTHENTICATES_TO' },
  { fields: ['owner', 'managedBy'], type: 'MANAGED_BY' },
  { fields: ['sshPublicKey', 'sshKey'], type: 'HAS_SSH_KEY' },
  { fields: ['sudoPolicy'], type: 'HAS_SUDO_POLICY' },
]

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  return String(value ?? '').split(/[;,|]/).map((item) => item.trim()).filter(Boolean)
}

export function convertRelationships(records: CorrelationRecord[], recordNodeIds: Map<string, string>, nodes: ImportedGraphNode[]): { relationships: ImportedGraphRelationship[]; unresolved: UnresolvedReference[] } {
  const resolver = new ReferenceResolver(nodes)
  const relationships: ImportedGraphRelationship[] = []
  const unresolved: UnresolvedReference[] = []
  const seen = new Set<string>()
  for (const record of records) {
    const sourceReference = ['objectGUID', 'sid', 'distinguishedName', 'employeeId', 'username', 'samAccountName', 'userPrincipalName', 'email']
      .map((field) => record.fields[field]).find((value) => value !== undefined && value !== '')
    const source = recordNodeIds.get(record.recordId) ?? resolver.resolve(sourceReference)
    if (!source) continue

    for (const member of values(record.fields.members)) {
      const memberId = resolver.resolve(member)
      if (!memberId || memberId === source) {
        unresolved.push({ recordId: record.recordId, field: 'members', value: member, relationshipType: 'MEMBER_OF', reason: 'No unique member node' })
      } else {
        const key = `${memberId}|MEMBER_OF|${source}`
        if (!seen.has(key)) {
          seen.add(key)
          relationships.push({ id: deterministicId('relationship', memberId, 'MEMBER_OF', source), source: memberId, target: source, relationshipType: 'MEMBER_OF', sourceSystem: String(record.sourceSystem || 'CUSTOM').toUpperCase(), properties: { sourceField: 'members', rawReference: member } })
        }
      }
    }
    for (const rule of RULES) {
      for (const field of rule.fields) {
        for (const value of values(record.fields[field])) {
          const target = resolver.resolve(value)
          if (!target || target === source) {
            unresolved.push({ recordId: record.recordId, field, value, relationshipType: rule.type, reason: target === source ? 'Self reference' : 'No unique target node' })
            continue
          }
          const key = `${source}|${rule.type}|${target}`
          if (seen.has(key)) continue
          seen.add(key)
          relationships.push({
            id: deterministicId('relationship', source, rule.type, target), source, target, relationshipType: rule.type,
            sourceSystem: String(record.sourceSystem || 'CUSTOM').toUpperCase(), properties: { sourceField: field, rawReference: value },
          })
        }
      }
    }
  }
  return { relationships, unresolved }
}
