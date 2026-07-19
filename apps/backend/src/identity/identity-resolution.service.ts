import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common'
import { deterministicId } from '../imports/graph-conversion/deterministic-id'
import { OperationalStoreService } from '../database/operational-store.service'
import {
  CONFIDENCE_THRESHOLD,
  toConfidenceLevel,
  type EnterpriseIdentity,
  type EnterpriseIdentitySource,
  type MergeSource,
  type ConfidenceScore,
  type MergeFieldMatch,
  type MergeConflict,
  type IdentityTimelineEvent,
  type MergeStatistics,
  type CorrelationCandidate,
  type CorrelationResult,
  type CorrelationRequest,
} from './identity.types'

interface IdentityFieldDef {
  field: string
  priority: number
  score: number
  method: string
  aliases: string[]
}

const IDENTITY_FIELDS: IdentityFieldDef[] = [
  { field: 'employeeId', priority: 1, score: 100, method: 'employeeID', aliases: ['employeeId', 'employeeID', 'employee_number', 'employeeNumber'] },
  { field: 'employeeNumber', priority: 2, score: 100, method: 'employeeNumber', aliases: ['employeeNumber', 'employee_number'] },
  { field: 'objectGUID', priority: 3, score: 95, method: 'objectGUID', aliases: ['objectGUID', 'objectguid', 'guid'] },
  { field: 'objectSid', priority: 4, score: 90, method: 'objectSid', aliases: ['objectSid', 'objectsid', 'sid'] },
  { field: 'email', priority: 5, score: 85, method: 'email', aliases: ['email', 'mail', 'emailAddress', 'email_address'] },
  { field: 'userPrincipalName', priority: 6, score: 80, method: 'UPN', aliases: ['userPrincipalName', 'upn', 'user_principal_name'] },
  { field: 'krbPrincipalName', priority: 7, score: 70, method: 'krbPrincipalName', aliases: ['krbPrincipalName', 'krb_principal_name', 'principal'] },
  { field: 'uid', priority: 8, score: 70, method: 'uid', aliases: ['uid', 'userid', 'userId'] },
  { field: 'samAccountName', priority: 9, score: 70, method: 'sAMAccountName', aliases: ['samAccountName', 'sAMAccountName', 'sam_account_name'] },
  { field: 'username', priority: 10, score: 70, method: 'username', aliases: ['username', 'userName', 'login', 'loginName'] },
  { field: 'displayName', priority: 11, score: 60, method: 'displayName', aliases: ['displayName', 'display_name', 'fullName', 'full_name', 'cn'] },
]

function getProperty(props: Record<string, unknown>, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const val = props[alias]
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim()
    }
  }
  return undefined
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function extractSource(node: Record<string, unknown>): MergeSource {
  const props = (node.properties ?? {}) as Record<string, unknown>
  const src = String(node.sourceSystem ?? props.sourceSystem ?? node.source ?? props.source ?? 'CUSTOM').toUpperCase()
  if (src.includes('ACTIVE_DIRECTORY') || src === 'AD') return 'ACTIVE_DIRECTORY'
  if (src.includes('ENTRA_ID') || src.includes('ENTRA')) return 'ENTRA_ID'
  if (src.includes('FREE_IPA') || src.includes('FREEIPA') || src.includes('IPA')) return 'FREE_IPA'
  if (src.includes('LINUX') || src.includes('SSH')) return 'LINUX'
  if (src.includes('LDAP')) return 'LDAP'
  if (src === 'MANUAL') return 'MANUAL'
  return 'CUSTOM'
}

@Injectable()
export class IdentityResolutionService implements OnModuleInit {
  private readonly logger = new Logger(IdentityResolutionService.name)

  private enterpriseIdentities = new Map<string, EnterpriseIdentity>()

  constructor(@Optional() private readonly store?: OperationalStoreService) {}

  async onModuleInit() {
    if (!this.store) return
    const rows = await this.store.loadIdentities()
    this.enterpriseIdentities = new Map(rows.map((row) => [row.id, row.payload as unknown as EnterpriseIdentity]))
  }

  findCandidate(
    properties: Record<string, unknown>,
    source: MergeSource,
    nodeId: string,
    displayName: string,
    existingIdentities?: EnterpriseIdentity[],
  ): CorrelationCandidate[] {
    const candidates: CorrelationCandidate[] = []

    for (const fieldDef of IDENTITY_FIELDS) {
      const value = getProperty(properties, fieldDef.aliases)
      if (!value) continue

      const normalized = fieldDef.field === 'email' ? normalizeEmail(value) : value

      if (existingIdentities) {
        for (const existing of existingIdentities) {
          const existingValue = getProperty(existing.mergedFields, fieldDef.aliases)
          if (existingValue && normalizeMatch(fieldDef.field, existingValue, normalized)) {
            candidates.push({
              nodeId,
              source,
              displayName,
              confidence: fieldDef.score,
              method: fieldDef.method,
              matchedField: fieldDef.field,
              matchedValue: normalized,
              properties,
            })
          }
        }
      }

      candidates.push({
        nodeId,
        source,
        displayName,
        confidence: fieldDef.score,
        method: fieldDef.method,
        matchedField: fieldDef.field,
        matchedValue: normalized,
        properties,
      })
    }

    candidates.sort((a, b) => b.confidence - a.confidence)
    return candidates
  }

  score(node: Record<string, unknown>, existingIdentity: EnterpriseIdentity): ConfidenceScore | null {
    const props = (node.properties ?? node) as Record<string, unknown>
    for (const fieldDef of IDENTITY_FIELDS) {
      const nodeValue = getProperty(props, fieldDef.aliases)
      if (!nodeValue) continue
      const existingValue = getProperty(existingIdentity.mergedFields, fieldDef.aliases)
      if (!existingValue) continue
      if (normalizeMatch(fieldDef.field, nodeValue, existingValue)) {
        return {
          score: fieldDef.score,
          level: toConfidenceLevel(fieldDef.score),
          method: fieldDef.method,
          matchedField: fieldDef.field,
          matchedValue: nodeValue,
        }
      }
    }
    return null
  }

  computeConfidence(matchedFields: string[]): number {
    if (matchedFields.length === 0) return 0
    const bestScore = Math.max(
      ...matchedFields.map((field) => {
        const def = IDENTITY_FIELDS.find((d) => d.field === field || d.aliases.includes(field))
        return def ? def.score : 0
      }),
    )
    return bestScore
  }

  async correlate(request: CorrelationRequest, graphNodes: Record<string, unknown>[]): Promise<CorrelationResult> {
    const threshold = request.threshold ?? CONFIDENCE_THRESHOLD
    const allCandidates: CorrelationCandidate[] = []
    const identities = Array.from(this.enterpriseIdentities.values())

    for (const node of graphNodes) {
      const nodeId = String(node.id ?? '')
      const displayName = String(node.displayName ?? '')
      const props = (node.properties ?? node) as Record<string, unknown>
      const source = extractSource(node)

      if (request.sourceSystems && !request.sourceSystems.includes(source)) continue
      if (request.nodeIds && !request.nodeIds.includes(nodeId)) continue

      const candidates = this.findCandidate(props, source, nodeId, displayName, identities)
      const best = candidates.find((c) => c.confidence >= threshold)
      if (best) allCandidates.push(best)
    }

    return { candidates: allCandidates, enterpriseIdentities: identities }
  }

  async merge(
    node: Record<string, unknown>,
    existingIdentity?: EnterpriseIdentity,
  ): Promise<EnterpriseIdentity> {
    const nodeId = String(node.id ?? '')
    const displayName = String(node.displayName ?? nodeId)
    const props = (node.properties ?? node) as Record<string, unknown>
    const source = extractSource(node)

    let sourceInfo = this.buildSource(source, nodeId, displayName, props, [])

    if (existingIdentity) {
      const scoreResult = this.score(props, existingIdentity)
      if (!scoreResult || scoreResult.score < CONFIDENCE_THRESHOLD) {
        return existingIdentity
      }

      if (!existingIdentity.mergedSources.find((s) => s.nodeId === nodeId)) {
        sourceInfo = this.buildSource(source, nodeId, displayName, props, [scoreResult.method])
        existingIdentity.mergedSources.push(sourceInfo)
        existingIdentity.confidence = Math.max(existingIdentity.confidence, scoreResult.score)
        existingIdentity.confidenceLevel = toConfidenceLevel(existingIdentity.confidence)
        existingIdentity.matchedFields.push({
          field: scoreResult.matchedField,
          valueA: String(getProperty(existingIdentity.mergedFields, [scoreResult.matchedField]) ?? ''),
          valueB: String(scoreResult.matchedValue),
          matchType: 'exact',
        })
      }

      existingIdentity.matchedFields = this.computeMatchedFields(existingIdentity.mergedSources)
      existingIdentity.conflicts = this.computeConflicts(existingIdentity.mergedSources)
      existingIdentity.mergedFields = this.mergeFields(existingIdentity.mergedSources)
      existingIdentity.timeline.push(this.buildTimelineEvent('source_added', `Merged ${source} identity`, source))
      existingIdentity.statistics = this.computeStatistics(existingIdentity)
      existingIdentity.updatedAt = new Date().toISOString()

      this.updateAccounts(existingIdentity, source, props)
      this.updateGroups(existingIdentity, props)
      this.updateRoles(existingIdentity, props)

      this.enterpriseIdentities.set(existingIdentity.id, existingIdentity)
      this.persist(existingIdentity)
      return existingIdentity
    }

    const candidates = this.findCandidate(props, source, nodeId, displayName, Array.from(this.enterpriseIdentities.values()))
    const bestMatch = candidates.find((c) => c.confidence >= CONFIDENCE_THRESHOLD)

    if (bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD) {
      const matchedId = this.findEnterpriseIdByField(bestMatch.matchedField, bestMatch.matchedValue)
      if (matchedId) {
        return this.merge(node, this.enterpriseIdentities.get(matchedId))
      }
    }

    const id = deterministicId('enterprise-identity', nodeId)
    const now = new Date().toISOString()
    const identity: EnterpriseIdentity = {
      id,
      canonicalIdentityId: id,
      displayName,
      mergedSources: [sourceInfo],
      confidence: sourceInfo.confidence,
      confidenceLevel: toConfidenceLevel(sourceInfo.confidence),
      matchedFields: [],
      conflicts: [],
      timeline: [this.buildTimelineEvent('source_added', `Created from ${source}`, source)],
      statistics: {
        totalSources: 1,
        matchedFields: 0,
        totalConflicts: 0,
        criticalConflicts: 0,
        resolvedConflicts: 0,
        confidenceScore: sourceInfo.confidence,
        mergeHistory: [{ timestamp: now, sources: [source] }],
      },
      mergedFields: this.extractIdentityFields(props),
      accounts: source === 'ACTIVE_DIRECTORY' || source === 'FREE_IPA' || source === 'LINUX'
        ? [{ source, accountName: displayName, disabled: Boolean(props.disabled || props.locked) }]
        : [],
      groups: [],
      roles: [],
      permissions: [],
      applications: [],
      servers: [],
      sudoPolicies: [],
      sshKeys: [],
      riskLevel: String(props.riskLevel ?? 'NONE').toUpperCase(),
      createdAt: now,
      updatedAt: now,
    }

    this.updateGroups(identity, props)
    this.updateRoles(identity, props)
    this.enterpriseIdentities.set(id, identity)
    this.persist(identity)
    return identity
  }

  getEnterpriseIdentity(id: string): EnterpriseIdentity | undefined {
    return this.enterpriseIdentities.get(id)
  }

  listEnterpriseIdentities(): EnterpriseIdentity[] {
    return Array.from(this.enterpriseIdentities.values())
  }

  private persist(identity: EnterpriseIdentity): void {
    this.store?.saveIdentity({ id: identity.id, canonicalIdentityId: identity.canonicalIdentityId, payload: identity as unknown as Record<string, unknown>, createdAt: new Date(identity.createdAt), updatedAt: new Date(identity.updatedAt) })
  }

  private buildSource(source: MergeSource, nodeId: string, displayName: string, props: Record<string, unknown>, matchedFields: string[]): EnterpriseIdentitySource {
    const score = matchedFields.length > 0
      ? this.computeConfidence(matchedFields)
      : 70
    return {
      source,
      nodeId,
      displayName,
      confidence: score,
      matchedFields,
      lastSeen: new Date().toISOString(),
      properties: props,
    }
  }

  private computeMatchedFields(sources: EnterpriseIdentitySource[]): MergeFieldMatch[] {
    const matches: MergeFieldMatch[] = []
    if (sources.length < 2) return matches

    for (let i = 0; i < sources.length - 1; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        for (const fieldDef of IDENTITY_FIELDS) {
          const valA = getProperty(sources[i].properties, fieldDef.aliases)
          const valB = getProperty(sources[j].properties, fieldDef.aliases)
          if (valA && valB) {
            matches.push({
              field: fieldDef.field,
              valueA: valA,
              valueB: valB,
              matchType: normalizeMatch(fieldDef.field, valA, valB) ? 'exact' : 'conflict',
            })
          }
        }
      }
    }
    return matches
  }

  private computeConflicts(sources: EnterpriseIdentitySource[]): MergeConflict[] {
    const conflicts: MergeConflict[] = []
    if (sources.length < 2) return conflicts

    for (let i = 0; i < sources.length - 1; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        for (const fieldDef of IDENTITY_FIELDS.slice(0, 6)) {
          const valA = getProperty(sources[i].properties, fieldDef.aliases)
          const valB = getProperty(sources[j].properties, fieldDef.aliases)
          if (valA && valB && !normalizeMatch(fieldDef.field, valA, valB)) {
            conflicts.push({
              field: fieldDef.field,
              sourceA: sources[i].source,
              sourceB: sources[j].source,
              valueA: valA,
              valueB: valB,
              severity: fieldDef.score >= 90 ? 'critical' : fieldDef.score >= 80 ? 'warning' : 'info',
            })
          }
        }
      }
    }
    return conflicts
  }

  private mergeFields(sources: EnterpriseIdentitySource[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {}
    const priority: MergeSource[] = ['MANUAL', 'ACTIVE_DIRECTORY', 'ENTRA_ID', 'FREE_IPA', 'LINUX', 'LDAP', 'CUSTOM']
    const sorted = [...sources].sort((a, b) => priority.indexOf(a.source) - priority.indexOf(b.source))
    for (const source of sorted) {
      for (const [key, value] of Object.entries(source.properties)) {
        if (value !== undefined && value !== null && value !== '' && !(key in merged)) {
          merged[key] = value
        }
      }
    }
    return merged
  }

  private extractIdentityFields(props: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = {}
    for (const fieldDef of IDENTITY_FIELDS) {
      const val = getProperty(props, fieldDef.aliases)
      if (val) fields[fieldDef.field] = val
    }
    return fields
  }

  private updateAccounts(identity: EnterpriseIdentity, source: MergeSource, props: Record<string, unknown>): void {
    const accountName = String(props.samAccountName || props.username || props.uid || props.email || props.displayName || '')
    if (accountName && !identity.accounts.find((a) => a.source === source && a.accountName === accountName)) {
      identity.accounts.push({
        source,
        accountName,
        domain: String(props.domain || props.dn || ''),
        disabled: Boolean(props.disabled || props.locked || props.accountDisabled),
      })
    }
  }

  private updateGroups(identity: EnterpriseIdentity, props: Record<string, unknown>): void {
    const groups = props.memberOf || props.groups || props.groupMembership
    if (Array.isArray(groups)) {
      for (const group of groups) {
        const name = String(group)
        if (!identity.groups.includes(name)) identity.groups.push(name)
      }
    } else if (typeof groups === 'string' && groups.trim()) {
      const parts = groups.split(/[,;|]/).map((g: string) => g.trim()).filter(Boolean)
      for (const name of parts) {
        if (!identity.groups.includes(name)) identity.groups.push(name)
      }
    }
  }

  private updateRoles(identity: EnterpriseIdentity, props: Record<string, unknown>): void {
    const roles = props.roles || props.role || props.roleMembership
    if (Array.isArray(roles)) {
      for (const role of roles) {
        const name = String(role)
        if (!identity.roles.includes(name)) identity.roles.push(name)
      }
    } else if (typeof roles === 'string' && roles.trim()) {
      const parts = roles.split(/[,;|]/).map((r: string) => r.trim()).filter(Boolean)
      for (const name of parts) {
        if (!identity.roles.includes(name)) identity.roles.push(name)
      }
    }
  }

  private findEnterpriseIdByField(field: string, value: string): string | undefined {
    for (const [id, identity] of this.enterpriseIdentities) {
      const existingValue = getProperty(identity.mergedFields, [field])
      if (existingValue && normalizeMatch(field, existingValue, value)) {
        return id
      }
    }
    return undefined
  }

  private buildTimelineEvent(type: IdentityTimelineEvent['type'], detail: string, source?: MergeSource): IdentityTimelineEvent {
    return { timestamp: new Date().toISOString(), type, detail, source }
  }

  private computeStatistics(identity: EnterpriseIdentity): MergeStatistics {
    return {
      totalSources: identity.mergedSources.length,
      matchedFields: identity.matchedFields.length,
      totalConflicts: identity.conflicts.length,
      criticalConflicts: identity.conflicts.filter((c) => c.severity === 'critical').length,
      resolvedConflicts: 0,
      confidenceScore: identity.confidence,
      mergeHistory: identity.timeline
        .filter((e) => e.type === 'source_added')
        .map((e) => ({ timestamp: e.timestamp, sources: e.source ? [e.source] : [] })),
    }
  }
}

function normalizeMatch(field: string, a: string, b: string): boolean {
  if (field === 'email') return normalizeEmail(a) === normalizeEmail(b)
  if (field === 'objectGUID' || field === 'objectSid' || field === 'sid') {
    return a.replace(/[-{}]/g, '').toLowerCase() === b.replace(/[-{}]/g, '').toLowerCase()
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
