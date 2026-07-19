import type { GraphNode, GraphLink, GraphData } from '../types/graph'
import type {
  LinuxHostSummary, LinuxHostDetail, LinuxUserAccess,
  LinuxGroupAccess, ServiceAccountAccess, SudoPolicyAccess,
  SshKeyAccess, EffectiveAccessEntry, ReverseAccessSummary,
  DependencyNode, LinuxRiskFinding, AccessPathEntry,
} from '../types/linux'
let graphData: GraphData = { nodes: [], links: [] }

function getData(): GraphData {
  return graphData
}

export function setLinuxGraphData(data: GraphData): void {
  graphData = data
  clearCache()
}

export function getNodeById(id: string): GraphNode | undefined {
  return getData().nodes.find((n) => n.id === id)
}

export function getLinksByNodeId(id: string): GraphLink[] {
  return getData().links.filter((l) => l.source === id || l.target === id)
}

function findLinkedNodeIds(nodeId: string, relType: string, direction: 'source' | 'target'): string[] {
  const results: string[] = []
  for (const link of getData().links) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
    if (link.relationshipType !== relType) continue
    if (direction === 'target' && sid === nodeId) results.push(tid as string)
    else if (direction === 'source' && tid === nodeId) results.push(sid as string)
  }
  return results
}

function getHostOsType(hostId: string): string {
  const osIds = findLinkedNodeIds(hostId, 'RUNS_ON', 'target')
  if (osIds.length === 0) return ''
  const os = getNodeById(osIds[0])
  if (!os) return ''
  return (os.properties?.osType as string) || ''
}

function getHostOsName(hostId: string): string {
  const osIds = findLinkedNodeIds(hostId, 'RUNS_ON', 'target')
  if (osIds.length === 0) return 'Unknown'
  const os = getNodeById(osIds[0])
  if (!os) return 'Unknown'
  const version = os.properties?.version as string
  return version || os.displayName
}

function getHostSite(hostId: string): string {
  const siteIds = findLinkedNodeIds(hostId, 'LOCATED_IN', 'target')
  if (siteIds.length === 0) return 'Unknown'
  const site = getNodeById(siteIds[0])
  return site?.displayName || siteIds[0]
}

function getHostSubnet(hostId: string): string {
  const subnetIds = findLinkedNodeIds(hostId, 'LOCATED_IN', 'target').filter(id =>
    getNodeById(id)?.nodeType === 'SUBNET',
  )
  if (subnetIds.length === 0) {
    const allTargets = findLinkedNodeIds(hostId, 'LOCATED_IN', 'target')
    for (const tid of allTargets) {
      const n = getNodeById(tid)
      if (n?.nodeType === 'SUBNET') return n.displayName
    }
    return 'Unknown'
  }
  const subnet = getNodeById(subnetIds[0])
  return subnet?.displayName || subnetIds[0]
}

function getEnvironment(host: GraphNode | string): string {
  if (typeof host === 'string') {
    const node = getNodeById(host)
    if (!node) return 'Unknown'
    return getEnvironment(node)
  }
  const env = host.properties?.environment as string
  if (env) return env
  const hostname = (host.properties?.hostname as string) || host.displayName
  if (hostname.includes('prod')) return 'Production'
  if (hostname.includes('dev') || hostname.includes('test')) return 'Development'
  if (hostname.includes('stg') || hostname.includes('stage')) return 'Staging'
  return 'Unknown'
}

function getHostSummary(node: GraphNode): LinuxHostSummary {
  const osType = getHostOsType(node.id)
  const isLinux = osType === 'LINUX' || osType === 'LINUX_OS'
  const isComp = node.nodeType === 'COMPUTER'
  const props = node.properties || {}

  return {
    id: node.id,
    hostname: (props.hostname as string) || node.displayName,
    fqdn: (props.fqdn as string) || '',
    operatingSystem: getHostOsName(node.id),
    environment: getEnvironment(node),
    ipAddresses: (props.ipAddresses as string[]) || (props.ipAddress ? [props.ipAddress as string] : []),
    site: getHostSite(node.id),
    subnet: getHostSubnet(node.id),
    owner: (props.owner as string) || (props.managedBy as string) || '',
    team: (props.team as string) || (props.departmentId as string) || '',
    status: (props.status as string) || 'ACTIVE',
    riskLevel: node.riskLevel,
    sourceSystem: node.sourceSystem,
    isLinux: isLinux || isComp,
    osType,
    accessibleUserCount: 0,
    accessibleGroupCount: 0,
    sudoEnabledIdentityCount: 0,
    sshEnabledIdentityCount: 0,
  }
}

function findSudoPoliciesForHost(hostId: string): SudoPolicyAccess[] {
  const allNodes = getData().nodes
  const sudoNodes = allNodes.filter((n) => n.nodeType === 'SUDO_POLICY')
  const results: SudoPolicyAccess[] = []

  for (const sudo of sudoNodes) {
    const hostIds = sudo.properties?.hostIds as string[] | undefined
    if (!hostIds || !hostIds.includes(hostId)) continue
    const commands = sudo.properties?.commands as string[] || []
    const groupIds = sudo.properties?.groupIds as string[] || []
    const runAsUsers = sudo.properties?.runAsUsers as string[] || ['root']

    const sudoPolicyLinks = getData().links.filter(
      (l) => l.relationshipType === 'HAS_ACCESS' && l.target === sudo.id,
    )
    const rawGids: string[] = []
    for (const link of sudoPolicyLinks) {
      const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
      rawGids.push(sid as string)
    }

    results.push({
      id: sudo.id,
      displayName: sudo.displayName,
      commands,
      nopasswd: sudo.properties?.nopasswd === true,
      runAsUsers,
      hostIds,
      sourceSystem: sudo.sourceSystem,
      groupIds: groupIds.length > 0 ? groupIds : rawGids,
      isWildcard: commands.includes('ALL'),
      isDirectRoot: runAsUsers.includes('root') && commands.includes('ALL'),
    })
  }

  return results
}

function findSshKeysForUser(linuxUserId: string): SshKeyAccess[] {
  const allNodes = getData().nodes
  const sshNodes = allNodes.filter((n) => n.nodeType === 'SSH_KEY')
  const results: SshKeyAccess[] = []

  for (const key of sshNodes) {
    const ownerId = key.properties?.ownerId as string
    if (ownerId !== linuxUserId) continue
    const lastUsed = key.properties?.lastUsed as string
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    results.push({
      id: key.id,
      displayName: key.displayName,
      algorithm: key.properties?.algorithm as string || 'Unknown',
      keySize: (key.properties?.keySize as number) || 0,
      fingerprint: key.properties?.fingerprint as string || '',
      ownerId,
      lastUsed,
      unused: !lastUsed || new Date(lastUsed) < oneYearAgo,
    })
  }

  return results
}

function getLinuxUsersForHost(hostId: string): { users: LinuxUserAccess[]; groups: LinuxGroupAccess[] } {
  const allNodes = getData().nodes
  const allLinks = getData().links
  const sudoPolicies = findSudoPoliciesForHost(hostId)
  const sudoGroupIds = new Set<string>()
  for (const sp of sudoPolicies) {
    for (const gid of sp.groupIds) sudoGroupIds.add(gid)
  }

  const linuxUsers = allNodes.filter((n) => n.nodeType === 'LINUX_USER')
  const linuxGroups = allNodes.filter((n) => n.nodeType === 'LINUX_GROUP')
  const sshKeys = allNodes.filter((n) => n.nodeType === 'SSH_KEY')
  const sshUserIds = new Set(
    sshKeys.map((k) => k.properties?.ownerId as string).filter(Boolean),
  )

  const users: LinuxUserAccess[] = []
  const groupsMap = new Map<string, LinuxGroupAccess>()

  for (const group of linuxGroups) {
    const memberIds = group.properties?.memberIds as string[] || []
    const membershipLinks = allLinks.filter(
      (l) => l.relationshipType === 'MEMBER_OF' && l.target === group.id,
    )
    for (const link of membershipLinks) {
      const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
      if (!memberIds.includes(sid as string)) memberIds.push(sid as string)
    }

    const hasSudo = sudoGroupIds.has(group.id)
    groupsMap.set(group.id, {
      id: group.id,
      displayName: group.displayName,
      gid: (group.properties?.gid as number) || 0,
      memberCount: memberIds.length,
      sudoAccess: hasSudo,
      sshAccess: memberIds.some((mid) => sshUserIds.has(mid)),
      members: memberIds,
    })
  }

  for (const luser of linuxUsers) {
    const groupIds = luser.properties?.groupIds as string[] || []
    const membershipLinks = allLinks.filter(
      (l) => l.relationshipType === 'MEMBER_OF' && l.source === luser.id,
    )
    for (const link of membershipLinks) {
      const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
      if (!groupIds.includes(tid as string)) groupIds.push(tid as string)
    }

    const hasSudo = groupIds.some((gid) => sudoGroupIds.has(gid))
    const hasSSH = sshUserIds.has(luser.id)
    const shell = luser.properties?.shell as string || '/bin/bash'
    const privilegedShell = shell.includes('bash') || shell.includes('sh') || shell.includes('zsh')

    const accessPaths: string[] = []
    for (const gid of groupIds) {
      const g = groupsMap.get(gid)
      if (!g) continue
      if (g.sudoAccess || g.sshAccess) {
        for (const sp of sudoPolicies) {
          if (sp.groupIds.includes(gid)) {
            if (g.sudoAccess) {
              accessPaths.push(`${luser.displayName} → ${g.displayName} → ${sp.displayName} → Host`)
            }
          }
        }
        if (g.sshAccess) {
          accessPaths.push(`${luser.displayName} → ${g.displayName} → SSH Key → Host`)
        }
      }
    }

    users.push({
      id: luser.id,
      displayName: luser.displayName,
      sourceSystem: luser.sourceSystem,
      uid: luser.properties?.uid as number,
      shell,
      homeDirectory: luser.properties?.homeDirectory as string,
      locked: luser.properties?.locked as boolean,
      lastLogin: undefined,
      sudoAccess: hasSudo,
      sshAccess: hasSSH,
      privilegedShell,
      accessPaths,
      metadata: luser.properties?.metadata as Record<string, unknown>,
    })
  }

  return { users, groups: Array.from(groupsMap.values()) }
}

function getAdUsersForHost(hostId: string): LinuxUserAccess[] {
  const result: LinuxUserAccess[] = []
  const allLinks = getData().links
  const allNodes = getData().nodes

  const adAuthLinks = allLinks.filter(
    (l) => l.relationshipType === 'AUTHENTICATES_TO' && l.target === hostId && l.sourceSystem === 'ACTIVE_DIRECTORY',
  )

  for (const link of adAuthLinks) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const user = getNodeById(sid as string)
    if (!user || user.nodeType !== 'USER') continue

    const linuxUserNodes = allNodes.filter(
      (n) => n.nodeType === 'LINUX_USER' &&
        (n.properties?.metadata as Record<string, unknown>)?.['adUserId'] === user.id,
    )

    const hasLinuxMapping = linuxUserNodes.length > 0
    const shell = user.properties?.shell as string || ''

    result.push({
      id: user.id,
      displayName: user.displayName,
      sourceSystem: 'ACTIVE_DIRECTORY',
      sudoAccess: hasLinuxMapping,
      sshAccess: true,
      privilegedShell: hasLinuxMapping && (shell.includes('bash') || shell.includes('sh') || shell.includes('zsh')),
      accessPaths: [`${user.displayName} → AUTHENTICATES_TO → ${hostId}`],
    })
  }

  return result
}

function getFreeIpaUsersForHost(hostId: string): LinuxUserAccess[] {
  const result: LinuxUserAccess[] = []
  const allLinks = getData().links

  const ipaLinks = allLinks.filter(
    (l) => l.relationshipType === 'AUTHENTICATES_TO' && l.target === hostId && l.sourceSystem === 'FREE_IPA',
  )

  for (const link of ipaLinks) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const user = getNodeById(sid as string)
    if (!user) continue

    result.push({
      id: user.id,
      displayName: user.displayName,
      sourceSystem: 'FREE_IPA',
      sudoAccess: false,
      sshAccess: true,
      privilegedShell: false,
      accessPaths: [`${user.displayName} → AUTHENTICATES_TO → ${hostId}`],
    })
  }

  return result
}

function getServiceAccountsForHost(hostId: string): ServiceAccountAccess[] {
  const result: ServiceAccountAccess[] = []
  const allLinks = getData().links

  const msvcLinks = allLinks.filter(
    (l) => l.relationshipType === 'RUNS_ON' && l.target === hostId,
  )

  for (const link of msvcLinks) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const svcNode = getNodeById(sid as string)
    if (!svcNode) continue

    const allowedHosts: string[] = []
    if (svcNode.nodeType === 'MANAGED_SERVICE_ACCOUNT') {
      allowedHosts.push(hostId)
    }
    if (svcNode.nodeType === 'SERVICE_ACCOUNT') {
      const ah = svcNode.properties?.allowedHostIds as string[] | undefined
      if (ah) allowedHosts.push(...ah)
    }

    const shell = svcNode.properties?.servicePrincipalName as string || ''
    result.push({
      id: svcNode.id,
      displayName: svcNode.displayName,
      principalName: (svcNode.properties?.principalName as string) || svcNode.displayName,
      managedBy: svcNode.properties?.managedBy as string,
      allowedHosts,
      interactiveShell: !shell.includes('/') && !shell.includes('@'),
    })
  }

  return result
}

function getApplicationsForHost(hostId: string): string[] {
  const allLinks = getData().links
  const result: string[] = []

  const dbNodes = getData().nodes.filter((n) => {
    if (n.nodeType !== 'DATABASE') return false
    return (n.properties?.hostId as string) === hostId
  })

  const dbAppLinks = allLinks.filter(
    (l) => l.relationshipType === 'CONNECTS_TO' && dbNodes.some((db) => db.id === l.target),
  )

  for (const link of dbAppLinks) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const app = getNodeById(sid as string)
    if (app && app.nodeType === 'APPLICATION' && !result.includes(app.displayName)) {
      result.push(app.displayName)
    }
  }

  return result
}

function getDatabasesForHost(hostId: string): string[] {
  return getData().nodes
    .filter((n) => n.nodeType === 'DATABASE' && (n.properties?.hostId as string) === hostId)
    .map((n) => n.displayName)
}

function getBusinessServicesForHost(hostId: string): string[] {
  const allLinks = getData().links
  const result: string[] = []

  const dbNodes = getData().nodes.filter((n) => {
    if (n.nodeType !== 'DATABASE') return false
    return (n.properties?.hostId as string) === hostId
  })

  const dbAppLinks = allLinks.filter(
    (l) => l.relationshipType === 'CONNECTS_TO' && dbNodes.some((db) => db.id === l.target),
  )

  for (const link of dbAppLinks) {
    const appId = typeof link.source === 'object' ? (link.source as any).id : link.source
    const bsvcLinks = allLinks.filter(
      (l) => l.relationshipType === 'PART_OF' && l.source === appId,
    )

    for (const bl of bsvcLinks) {
      const bsvcId = typeof bl.target === 'object' ? (bl.target as any).id : bl.target
      const bsvc = getNodeById(bsvcId as string)
      if (bsvc && !result.includes(bsvc.displayName)) {
        result.push(bsvc.displayName)
      }
    }
  }

  return result
}

export function computeEffectiveAccess(hostId: string): EffectiveAccessEntry[] {
  const { users: linuxUsers } = getLinuxUsersForHost(hostId)
  const adUsers = getAdUsersForHost(hostId)
  const ipaUsers = getFreeIpaUsersForHost(hostId)
  const entries: EffectiveAccessEntry[] = []

  for (const lu of linuxUsers) {
    const isInherited = !lu.sudoAccess && lu.sshAccess
    const paths: AccessPathEntry[] = []

    if (lu.sudoAccess) {
      paths.push({
        nodes: [
          { id: lu.id, displayName: lu.displayName, nodeType: 'LINUX_USER', relationshipType: '' },
          { id: '', displayName: 'Sudo Policy', nodeType: 'SUDO_POLICY', relationshipType: 'HAS_ACCESS' },
          { id: hostId, displayName: '', nodeType: 'HOST', relationshipType: '' },
        ],
        direct: true,
      })
    }

    if (lu.sshAccess) {
      paths.push({
        nodes: [
          { id: lu.id, displayName: lu.displayName, nodeType: 'LINUX_USER', relationshipType: '' },
          { id: '', displayName: 'SSH Key', nodeType: 'SSH_KEY', relationshipType: 'OWNS' },
          { id: hostId, displayName: '', nodeType: 'HOST', relationshipType: '' },
        ],
        direct: true,
      })
    }

    entries.push({
      identityId: lu.id,
      identityName: lu.displayName,
      identityType: 'LINUX_USER',
      sourceSystem: lu.sourceSystem,
      directSsh: lu.sshAccess && !isInherited,
      inheritedSsh: isInherited,
      directSudo: lu.sudoAccess,
      inheritedSudo: false,
      privilegedShell: lu.privilegedShell,
      accessPaths: paths,
    })
  }

  for (const ad of adUsers) {
    entries.push({
      identityId: ad.id,
      identityName: ad.displayName,
      identityType: 'USER',
      sourceSystem: 'ACTIVE_DIRECTORY',
      directSsh: ad.sshAccess,
      inheritedSsh: false,
      directSudo: ad.sudoAccess,
      inheritedSudo: false,
      privilegedShell: ad.privilegedShell,
      accessPaths: [],
    })
  }

  for (const ipa of ipaUsers) {
    entries.push({
      identityId: ipa.id,
      identityName: ipa.displayName,
      identityType: 'USER',
      sourceSystem: 'FREE_IPA',
      directSsh: true,
      inheritedSsh: false,
      directSudo: false,
      inheritedSudo: false,
      privilegedShell: false,
      accessPaths: [],
    })
  }

  return entries
}

function computeReverseAccess(hostId: string): ReverseAccessSummary {
  const { users: linuxUsers, groups } = getLinuxUsersForHost(hostId)
  const adUsers = getAdUsersForHost(hostId)

  const directUsers = linuxUsers.map((u) => u.displayName)
  const groupMembers = groups.filter((g) => g.memberCount > 0).map((g) => g.displayName)
  const sudoUsers = linuxUsers.filter((u) => u.sudoAccess).map((u) => u.displayName)
  const sshOnlyUsers = linuxUsers.filter((u) => u.sshAccess && !u.sudoAccess).map((u) => u.displayName)
  const indirectUsers = adUsers.map((u) => u.displayName)
  const bsvcs = getBusinessServicesForHost(hostId)

  return {
    totalIdentities: directUsers.length + groupMembers.length + indirectUsers.length,
    directUsers,
    groupMembers,
    sudoUsers,
    sshOnlyUsers,
    indirectUsers,
    dependentBusinessServices: bsvcs,
    impactDescription: `If ${hostId} is unavailable, ${bsvcs.length} business service(s) and ${groupMembers.length} group(s) may be affected.`,
  }
}

function computeDependencies(hostId: string): DependencyNode[] {
  const allNodes = getData().nodes
  const allLinks = getData().links
  const result: DependencyNode[] = []
  const seen = new Set<string>()

  const sudoPolicies = findSudoPoliciesForHost(hostId)
  for (const sp of sudoPolicies) {
    for (const gid of sp.groupIds) {
      const g = getNodeById(gid)
      if (g && !seen.has(g.id)) {
        seen.add(g.id)
        result.push({ id: g.id, displayName: g.displayName, nodeType: g.nodeType, direction: 'upstream' })
      }

      const memberLinks = allLinks.filter(
        (l) => l.relationshipType === 'MEMBER_OF' && l.target === gid,
      )
      for (const ml of memberLinks) {
        const sid = typeof ml.source === 'object' ? (ml.source as any).id : ml.source
        const lu = getNodeById(sid as string)
        if (lu && !seen.has(lu.id)) {
          seen.add(lu.id)
          result.push({ id: lu.id, displayName: lu.displayName, nodeType: lu.nodeType, direction: 'upstream' })
        }

        const sshKeys = allNodes.filter(
          (n) => n.nodeType === 'SSH_KEY' && n.properties?.ownerId === lu?.id,
        )
        for (const sk of sshKeys) {
          if (!seen.has(sk.id)) {
            seen.add(sk.id)
            result.push({ id: sk.id, displayName: sk.displayName, nodeType: sk.nodeType, direction: 'upstream' })
          }
        }
      }
    }
  }

  const adUsers = getAdUsersForHost(hostId)
  for (const ad of adUsers) {
    if (!seen.has(ad.id)) {
      seen.add(ad.id)
      result.push({ id: ad.id, displayName: ad.displayName, nodeType: 'USER', direction: 'upstream' })
    }
  }

  const dbNodes = allNodes.filter(
    (n) => n.nodeType === 'DATABASE' && (n.properties?.hostId as string) === hostId,
  )
  for (const db of dbNodes) {
    if (!seen.has(db.id)) {
      seen.add(db.id)
      result.push({ id: db.id, displayName: db.displayName, nodeType: db.nodeType, direction: 'downstream' })
    }
  }

  const bsvcs = getBusinessServicesForHost(hostId)
  const bsvcNodes = allNodes.filter((n) => bsvcs.includes(n.displayName))
  for (const bsvc of bsvcNodes) {
    if (!seen.has(bsvc.id)) {
      seen.add(bsvc.id)
      result.push({ id: bsvc.id, displayName: bsvc.displayName, nodeType: bsvc.nodeType, direction: 'downstream' })
    }
  }

  const apps = getApplicationsForHost(hostId)
  const appNodes = allNodes.filter((n) => apps.includes(n.displayName))
  for (const app of appNodes) {
    if (!seen.has(app.id)) {
      seen.add(app.id)
      result.push({ id: app.id, displayName: app.displayName, nodeType: app.nodeType, direction: 'downstream' })
    }
  }

  const otherHosts = allNodes.filter((n) => {
    if (n.nodeType !== 'HOST' && n.nodeType !== 'COMPUTER') return false
    if (n.id === hostId) return false
    const sameSite = getHostSite(n.id) === getHostSite(hostId)
    const sameEnv = getEnvironment(n) === getEnvironment(hostId)
    return sameSite && sameEnv
  })
  for (const oh of otherHosts) {
    if (!seen.has(oh.id)) {
      seen.add(oh.id)
      result.push({ id: oh.id, displayName: oh.displayName, nodeType: oh.nodeType, direction: 'downstream' })
    }
  }

  return result
}

function computeRiskFindings(hostId: string): LinuxRiskFinding[] {
  const findings: LinuxRiskFinding[] = []
  const { users: linuxUsers } = getLinuxUsersForHost(hostId)
  const sudoPolicies = findSudoPoliciesForHost(hostId)
  const adUsers = getAdUsersForHost(hostId)
  const svcAccounts = getServiceAccountsForHost(hostId)

  for (const lu of linuxUsers) {
    if (lu.locked && (lu.sudoAccess || lu.sshAccess)) {
      findings.push({
        type: 'disabled_user_linux_access',
        severity: 'high',
        title: 'Disabled user with Linux access',
        description: `Linux user "${lu.displayName}" is locked but still has ${lu.sudoAccess ? 'sudo' : 'SSH'} access to this host.`,
        relatedNodes: [lu.id],
      })
    }
  }

  const allNodes = getData().nodes
  const orphanedLinuxUsers = allNodes.filter((n) => {
    if (n.nodeType !== 'LINUX_USER') return false
    const links = getData().links.filter(
      (l) => l.source === n.id || l.target === n.id,
    )
    return links.length === 0
  })
  for (const orph of orphanedLinuxUsers) {
    findings.push({
      type: 'orphaned_linux_account',
      severity: 'medium',
      title: 'Orphaned Linux account',
      description: `Linux user "${orph.displayName}" has no relationships in the graph.`,
      relatedNodes: [orph.id],
    })
  }

  for (const lu of linuxUsers) {
    const sshKeys = findSshKeysForUser(lu.id)
    for (const key of sshKeys) {
      if (key.unused) {
        findings.push({
          type: 'unused_ssh_key',
          severity: 'medium',
          title: 'Unused SSH key',
          description: `SSH key "${key.displayName}" owned by ${lu.displayName} has not been used since ${key.lastUsed || 'unknown'}.`,
          relatedNodes: [key.id],
        })
      }
    }
  }

  const sharedPrivilegedGroups = getLinuxUsersForHost(hostId).groups.filter(
    (g) => g.sudoAccess && g.memberCount > 1,
  )
  for (const g of sharedPrivilegedGroups) {
    findings.push({
      type: 'shared_privileged_account',
      severity: 'high',
      title: 'Shared privileged account',
      description: `Linux group "${g.displayName}" has sudo access and ${g.memberCount} members, creating a shared privilege risk.`,
      relatedNodes: [g.id],
    })
  }

  for (const sp of sudoPolicies) {
    if (sp.isWildcard) {
      findings.push({
        type: 'wildcard_sudo_rule',
        severity: 'critical',
        title: 'Wildcard sudo rule',
        description: `Sudo policy "${sp.displayName}" grants ALL commands on ${sp.hostIds.length} host(s).`,
        relatedNodes: [sp.id],
      })
    }

    if (sp.nopasswd && sp.isWildcard) {
      findings.push({
        type: 'high_risk_sudo_policy',
        severity: 'critical',
        title: 'High-risk sudo policy',
        description: `Sudo policy "${sp.displayName}" allows passwordless execution of ALL commands.`,
        relatedNodes: [sp.id],
      })
    }

    if (sp.isDirectRoot) {
      findings.push({
        type: 'direct_root_access',
        severity: 'critical',
        title: 'Direct root access',
        description: `Sudo policy "${sp.displayName}" allows direct root access via ALL commands.`,
        relatedNodes: [sp.id],
      })
    }
  }

  const host = getNodeById(hostId)
  const env = host ? getEnvironment(host) : ''
  if (env === 'Production') {
    findings.push({
      type: 'production_host_access',
      severity: 'high',
      title: 'Production host access',
      description: `This host is a Production system. ${linuxUsers.length} Linux user(s) and ${adUsers.length} AD user(s) have access.`,
      relatedNodes: [hostId],
    })
  }

  for (const lu of linuxUsers) {
    const metadata = lu.metadata as Record<string, unknown> | undefined
    if (metadata?.adUserId) {
      findings.push({
        type: 'cross_system_linux_privilege',
        severity: 'medium',
        title: 'Cross-system identity with Linux privilege',
        description: `Linux user "${lu.displayName}" is linked to AD user and has ${lu.sudoAccess ? 'sudo' : 'SSH'} access.`,
        relatedNodes: [lu.id],
      })
    }
  }

  for (const svc of svcAccounts) {
    if (svc.interactiveShell) {
      findings.push({
        type: 'svc_account_interactive_shell',
        severity: 'high',
        title: 'Service account with interactive shell access',
        description: `Service account "${svc.displayName}" appears to have an interactive shell.`,
        relatedNodes: [svc.id],
      })
    }
  }

  return findings
}

const hostDetailCache = new Map<string, LinuxHostDetail>()

export function clearCache(): void {
  hostDetailCache.clear()
}

export function getAllLinuxHosts(): LinuxHostSummary[] {
  const allNodes = getData().nodes
  const hostNodes = allNodes.filter(
    (n) => n.nodeType === 'HOST' || n.nodeType === 'COMPUTER',
  )

  const hosts = hostNodes.map((node) => {
    const summary = getHostSummary(node)
    const detail = getHostDetail(node.id)
    if (detail) {
      summary.accessibleUserCount = detail.directLinuxUsers.length + detail.adUsers.length + detail.freeIpaUsers.length
      summary.accessibleGroupCount = detail.linuxGroups.length
      summary.sudoEnabledIdentityCount = detail.directLinuxUsers.filter((u) => u.sudoAccess).length + detail.adUsers.filter((u) => u.sudoAccess).length
      summary.sshEnabledIdentityCount = detail.directLinuxUsers.filter((u) => u.sshAccess).length + detail.adUsers.filter((u) => u.sshAccess).length + detail.freeIpaUsers.filter((u) => u.sshAccess).length
    }
    return summary
  })

  return hosts
}

export function getHostDetail(hostId: string): LinuxHostDetail | null {
  if (hostDetailCache.has(hostId)) {
    return hostDetailCache.get(hostId)!
  }

  const node = getNodeById(hostId)
  if (!node || (node.nodeType !== 'HOST' && node.nodeType !== 'COMPUTER')) return null

  const host = getHostSummary(node)
  const { users: directLinuxUsers, groups: linuxGroups } = getLinuxUsersForHost(hostId)
  const adUsers = getAdUsersForHost(hostId)
  const freeIpaUsers = getFreeIpaUsersForHost(hostId)
  const serviceAccounts = getServiceAccountsForHost(hostId)
  const sudoPolicies = findSudoPoliciesForHost(hostId)

  const allSshKeys: SshKeyAccess[] = []
  for (const lu of directLinuxUsers) {
    const keys = findSshKeysForUser(lu.id)
    allSshKeys.push(...keys)
  }

  const detail: LinuxHostDetail = {
    host,
    directLinuxUsers,
    linuxGroups,
    adUsers,
    freeIpaUsers,
    serviceAccounts,
    sudoPolicies,
    sshKeys: allSshKeys,
    applications: getApplicationsForHost(hostId),
    databases: getDatabasesForHost(hostId),
    businessServices: getBusinessServicesForHost(hostId),
  }

  hostDetailCache.set(hostId, detail)
  return detail
}

export const computeAccessPaths = computeEffectiveAccess
export const computeReverseAccessSummary = computeReverseAccess
export const computeDependencyNodes = computeDependencies
export const computeRiskFindingsForHost = computeRiskFindings

export function getAccessPathsForIdentity(hostId: string, identityId: string): AccessPathEntry[] {
  const entries = computeEffectiveAccess(hostId)
  const entry = entries.find((e) => e.identityId === identityId)
  return entry?.accessPaths || []
}

export function getLinuxHostsByFilter(filters: {
  environment?: string[]
  operatingSystem?: string[]
  sourceSystem?: string[]
  riskLevel?: string[]
  sshAccess?: string
  sudoAccess?: string
  privilegedAccess?: string
  hasApplication?: string
  hasDatabase?: string
  search?: string
}): LinuxHostSummary[] {
  let hosts = getAllLinuxHosts()

  if (filters.environment && filters.environment.length > 0) {
    hosts = hosts.filter((h) => filters.environment!.includes(h.environment))
  }
  if (filters.operatingSystem && filters.operatingSystem.length > 0) {
    hosts = hosts.filter((h) => filters.operatingSystem!.some((os) => h.operatingSystem.includes(os)))
  }
  if (filters.sourceSystem && filters.sourceSystem.length > 0) {
    hosts = hosts.filter((h) => filters.sourceSystem!.includes(h.sourceSystem))
  }
  if (filters.riskLevel && filters.riskLevel.length > 0) {
    hosts = hosts.filter((h) => filters.riskLevel!.includes(h.riskLevel))
  }
  if (filters.sshAccess) {
    if (filters.sshAccess === 'yes') hosts = hosts.filter((h) => h.sshEnabledIdentityCount > 0)
    else if (filters.sshAccess === 'no') hosts = hosts.filter((h) => h.sshEnabledIdentityCount === 0)
  }
  if (filters.sudoAccess) {
    if (filters.sudoAccess === 'yes') hosts = hosts.filter((h) => h.sudoEnabledIdentityCount > 0)
    else if (filters.sudoAccess === 'no') hosts = hosts.filter((h) => h.sudoEnabledIdentityCount === 0)
  }
  if (filters.privilegedAccess) {
    if (filters.privilegedAccess === 'yes') hosts = hosts.filter((h) => h.sudoEnabledIdentityCount > 0 && h.sshEnabledIdentityCount > 0)
    else if (filters.privilegedAccess === 'no') hosts = hosts.filter((h) => h.sudoEnabledIdentityCount === 0 && h.sshEnabledIdentityCount === 0)
  }
  if (filters.hasApplication === 'yes') {
    hosts = hosts.filter((h) => {
      const d = hostDetailCache.get(h.id) || getHostDetail(h.id)
      return d ? d.applications.length > 0 : false
    })
  }
  if (filters.hasDatabase === 'yes') {
    hosts = hosts.filter((h) => {
      const d = hostDetailCache.get(h.id) || getHostDetail(h.id)
      return d ? d.databases.length > 0 : false
    })
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    hosts = hosts.filter(
      (h) =>
        h.hostname.toLowerCase().includes(q) ||
        h.fqdn.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q),
    )
  }

  return hosts
}
