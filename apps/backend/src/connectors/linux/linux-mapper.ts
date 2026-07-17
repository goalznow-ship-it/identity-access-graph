import { createHash } from 'node:crypto'
import type { PasswdEntry, GroupEntry, SudoRule, AuthorizedKeyEntry, HostIdentity, NormalizedLinuxObject, LinuxGraphResult } from './linux-ssh.types'
import { fingerprintSshKey } from './linux-command-parser'

function deterministicId(type: string, ...parts: unknown[]): string {
  const key = parts.map(p => String(p ?? '')).join('|')
  return `linux:${type}:${createHash('sha256').update(key).digest('hex').slice(0, 24)}`
}

function isHumanAccount(uid: number): boolean {
  return uid >= 1000
}

export function mapPasswdToObjects(entries: PasswdEntry[], connectorId: string, syncRunId: string, extractedAt: string): { objects: NormalizedLinuxObject[]; nodes: any[]; relationships: any[] } {
  const nodes: any[] = []
  const relationships: any[] = []
  const objects: NormalizedLinuxObject[] = []
  const humanAccounts = entries.filter(e => isHumanAccount(e.uid))

  for (const entry of humanAccounts) {
    const id = deterministicId('user', entry.username)
    objects.push({
      recordId: id,
      objectType: 'USER',
      sourceFile: entry.sourceFile,
      sourceLine: entry.sourceLine,
      attributes: { ...entry } as any,
    })
    nodes.push({
      id,
      displayName: entry.username,
      nodeType: 'LINUX_USER',
      sourceSystem: 'LINUX',
      sourceId: entry.username,
      riskLevel: entry.loginDisabled ? 'LOW' : 'NONE',
      properties: { ...entry, connectorId, syncRunId, extractedAt, sourceFile: entry.sourceFile, sourceLine: entry.sourceLine },
    })
  }

  return { objects, nodes, relationships }
}

export function mapGroupToObjects(entries: GroupEntry[], userNodes: Map<string, string>, connectorId: string, syncRunId: string, extractedAt: string): { objects: NormalizedLinuxObject[]; nodes: any[]; relationships: any[] } {
  const nodes: any[] = []
  const relationships: any[] = []
  const objects: NormalizedLinuxObject[] = []

  for (const entry of entries) {
    const id = deterministicId('group', entry.groupName)
    objects.push({
      recordId: id,
      objectType: 'GROUP',
      sourceFile: entry.sourceFile,
      sourceLine: entry.sourceLine,
      attributes: { ...entry } as any,
    })
    nodes.push({
      id,
      displayName: entry.groupName,
      nodeType: 'LINUX_GROUP',
      sourceSystem: 'LINUX',
      sourceId: entry.groupName,
      riskLevel: 'NONE',
      properties: { ...entry, connectorId, syncRunId, extractedAt, sourceFile: entry.sourceFile, sourceLine: entry.sourceLine },
    })
    for (const member of entry.members) {
      const memberId = userNodes.get(member) ?? deterministicId('user', member)
      relationships.push({
        id: deterministicId('rel', 'MEMBER_OF', memberId, id),
        source: memberId,
        target: id,
        relationshipType: 'MEMBER_OF',
        sourceSystem: 'LINUX',
        properties: { connectorId, syncRunId, direct: true, inherited: false },
      })
    }
  }

  return { objects, nodes, relationships }
}

export function mapSudoToObjects(rules: SudoRule[], connectorId: string, syncRunId: string, extractedAt: string): { objects: NormalizedLinuxObject[]; nodes: any[]; relationships: any[] } {
  const nodes: any[] = []
  const relationships: any[] = []
  const objects: NormalizedLinuxObject[] = []

  for (const rule of rules) {
    const id = deterministicId('sudo', rule.rule)
    objects.push({
      recordId: id,
      objectType: 'SUDO_POLICY',
      sourceFile: rule.sourceFile,
      sourceLine: rule.sourceLine,
      attributes: { ...rule } as any,
    })
    nodes.push({
      id,
      displayName: rule.rule.slice(0, 80),
      nodeType: 'SUDO_POLICY',
      sourceSystem: 'LINUX',
      sourceId: id,
      riskLevel: 'MEDIUM',
      properties: { ...rule, connectorId, syncRunId, extractedAt, sourceFile: rule.sourceFile, sourceLine: rule.sourceLine },
    })
  }

  return { objects, nodes, relationships }
}

export function mapHostIdentity(hostId: HostIdentity, connectorId: string, syncRunId: string, extractedAt: string): { objects: NormalizedLinuxObject[]; nodes: any[]; relationships: any[] } {
  const hostNodeId = deterministicId('host', hostId.fqdn || hostId.hostname)
  const osNodeId = deterministicId('os', hostId.os)
  const nodes: any[] = []
  const relationships: any[] = []
  const objects: NormalizedLinuxObject[] = []

  nodes.push({
    id: hostNodeId,
    displayName: hostId.fqdn || hostId.hostname,
    nodeType: 'HOST',
    sourceSystem: 'LINUX',
    sourceId: hostId.machineId || hostId.hostname,
    riskLevel: 'NONE',
    properties: { ...hostId, connectorId, syncRunId, extractedAt },
  })

  objects.push({
    recordId: hostNodeId,
    objectType: 'HOST',
    sourceFile: '/etc/hostname',
    sourceLine: 1,
    attributes: { ...hostId } as any,
  })

  if (hostId.os) {
    nodes.push({
      id: osNodeId,
      displayName: hostId.os,
      nodeType: 'OPERATING_SYSTEM',
      sourceSystem: 'LINUX',
      sourceId: hostId.machineId || hostId.os,
      riskLevel: 'NONE',
      properties: { os: hostId.os, kernel: hostId.kernel, architecture: hostId.architecture, connectorId, syncRunId, extractedAt },
    })
    objects.push({
      recordId: osNodeId,
      objectType: 'OPERATING_SYSTEM',
      sourceFile: '/etc/os-release',
      sourceLine: 1,
      attributes: { os: hostId.os, kernel: hostId.kernel, architecture: hostId.architecture },
    })
    relationships.push({
      id: deterministicId('rel', 'RUNS_ON', osNodeId, hostNodeId),
      source: osNodeId,
      target: hostNodeId,
      relationshipType: 'RUNS_ON',
      sourceSystem: 'LINUX',
      properties: { connectorId, syncRunId, direct: true },
    })
  }

  return { objects, nodes, relationships }
}

export function mapAuthorizedKeys(keys: AuthorizedKeyEntry[], userNodes: Map<string, string>, connectorId: string, syncRunId: string, extractedAt: string): { objects: NormalizedLinuxObject[]; nodes: any[]; relationships: any[] } {
  const nodes: any[] = []
  const relationships: any[] = []
  const objects: NormalizedLinuxObject[] = []

  for (const key of keys) {
    const keyId = deterministicId('sshkey', key.fingerprint)
    objects.push({
      recordId: keyId,
      objectType: 'SSH_KEY',
      sourceFile: key.sourceFile,
      sourceLine: key.sourceLine,
      attributes: { ...key } as any,
    })
    nodes.push({
      id: keyId,
      displayName: `${key.keyType} ${key.fingerprint.slice(0, 16)}...`,
      nodeType: 'SSH_KEY',
      sourceSystem: 'LINUX',
      sourceId: key.fingerprint,
      riskLevel: 'NONE',
      properties: { ...key, key: '[REDACTED]', connectorId, syncRunId, extractedAt, sourceFile: key.sourceFile, sourceLine: key.sourceLine },
    })
    const userId = userNodes.get(key.username)
    if (userId) {
      relationships.push({
        id: deterministicId('rel', 'HAS_SSH_KEY', userId, keyId),
        source: userId,
        target: keyId,
        relationshipType: 'HAS_SSH_KEY',
        sourceSystem: 'LINUX',
        properties: { connectorId, syncRunId, direct: true },
      })
    }
  }

  return { objects, nodes, relationships }
}

export function buildLinuxGraph(
  passwd: PasswdEntry[],
  groups: GroupEntry[],
  sudoRules: SudoRule[],
  keys: AuthorizedKeyEntry[],
  hostId: HostIdentity,
  connectorId: string,
  syncRunId: string,
  extractedAt: string,
): LinuxGraphResult {
  const allNodes: any[] = []
  const allRels: any[] = []
  const warnings: string[] = []

  const userNodesMap = new Map<string, string>()
  const humanAccounts = passwd.filter(e => isHumanAccount(e.uid))
  for (const entry of humanAccounts) {
    userNodesMap.set(entry.username, deterministicId('user', entry.username))
  }

  const { nodes: uNodes, relationships: uRels } = mapPasswdToObjects(passwd, connectorId, syncRunId, extractedAt)
  allNodes.push(...uNodes)
  allRels.push(...uRels)

  const { nodes: gNodes, relationships: gRels } = mapGroupToObjects(groups, userNodesMap, connectorId, syncRunId, extractedAt)
  allNodes.push(...gNodes)
  allRels.push(...gRels)

  const { nodes: sNodes, relationships: sRels } = mapSudoToObjects(sudoRules, connectorId, syncRunId, extractedAt)
  allNodes.push(...sNodes)
  allRels.push(...sRels)

  const { nodes: kNodes, relationships: kRels } = mapAuthorizedKeys(keys, userNodesMap, connectorId, syncRunId, extractedAt)
  allNodes.push(...kNodes)
  allRels.push(...kRels)

  const { nodes: hNodes, relationships: hRels } = mapHostIdentity(hostId, connectorId, syncRunId, extractedAt)
  allNodes.push(...hNodes)
  allRels.push(...hRels)

  return { nodes: allNodes, relationships: allRels, warnings }
}
