import type { GraphNode, GraphLink, GraphData } from '../types/graph'
import type {
  UserIdentity, CorrelatedIdentity, Membership,
  EffectiveAccess, AccessPath, PathNode, RiskFinding, UserProfileData,
} from '../types/identity'
import mockData from './mockGraphData.json'

let graphData: GraphData | null = null

function getData(): GraphData {
  if (!graphData) {
    graphData = mockData as unknown as GraphData
  }
  return graphData
}

export function setGraphData(data: GraphData): void {
  graphData = data
}

export function getNodeById(id: string): GraphNode | undefined {
  return getData().nodes.find((n) => n.id === id)
}

export function getLinksByNodeId(id: string): GraphLink[] {
  return getData().links.filter((l) => l.source === id || l.target === id)
}

export function getLinksBySourceId(id: string): GraphLink[] {
  return getData().links.filter((l) => l.source === id)
}

export function getLinksByTargetId(id: string): GraphLink[] {
  return getData().links.filter((l) => l.target === id)
}

function findNode(nodeId: string, nodes: GraphNode[]): GraphNode | undefined {
  return nodes.find((n) => n.id === nodeId)
}

function findLinkedNodes(
  nodeId: string,
  direction: 'source' | 'target' | 'both',
  links: GraphLink[],
): GraphNode[] {
  const nodes = getData().nodes
  const linked: GraphNode[] = []
  const seen = new Set<string>()
  for (const link of links) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
    if (direction === 'source' || direction === 'both') {
      if (tid === nodeId && !seen.has(sid as string)) {
        const n = findNode(sid as string, nodes)
        if (n) { linked.push(n); seen.add(n.id) }
      }
    }
    if (direction === 'target' || direction === 'both') {
      if (sid === nodeId && !seen.has(tid as string)) {
        const n = findNode(tid as string, nodes)
        if (n) { linked.push(n); seen.add(n.id) }
      }
    }
  }
  return linked
}

function getMemberships(
  userId: string,
  linkType: string,
  direction: 'source' | 'target',
): { direct: Membership[]; allIds: Set<string> } {
  const allLinks = getData().links
  const nodes = getData().nodes
  const directMemberships: Membership[] = []
  const allIds = new Set<string>()

  for (const link of allLinks) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
    const isMatch = direction === 'target' ? sid === userId : tid === userId
    if (isMatch && link.relationshipType === linkType) {
      const targetId = direction === 'target' ? tid : sid
      const target = findNode(targetId as string, nodes)
      if (target) {
        directMemberships.push({ node: target, direct: true, relationshipType: linkType })
        allIds.add(target.id)
      }
    }
  }

  return { direct: directMemberships, allIds }
}

function getNestedGroupMemberships(
  _userId: string,
  directGroupIds: Set<string>,
): Membership[] {
  const allLinks = getData().links
  const nodes = getData().nodes
  const indirect: Membership[] = []
  const visited = new Set<string>(directGroupIds)
  const queue = Array.from(directGroupIds)

  while (queue.length > 0) {
    const gid = queue.shift()!
    for (const link of allLinks) {
      const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
      const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
      if (sid === gid && link.relationshipType === 'MEMBER_OF' && !visited.has(tid as string)) {
        const target = findNode(tid as string, nodes)
        if (target) {
          indirect.push({ node: target, direct: false, relationshipType: 'MEMBER_OF' })
          visited.add(target.id)
          queue.push(target.id)
        }
      }
    }
  }

  return indirect
}

function getRoles(userId: string): Membership[] {
  const allLinks = getData().links
  const nodes = getData().nodes
  const roles: Membership[] = []
  const visited = new Set<string>()

  for (const link of allLinks) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
    if (sid === userId && link.relationshipType === 'HAS_PERMISSION') {
      const target = findNode(tid as string, nodes)
      if (target && !visited.has(target.id)) {
        roles.push({ node: target, direct: true, relationshipType: 'HAS_PERMISSION' })
        visited.add(target.id)
      }
    }
  }

  return roles
}

function getRolePermissions(roleIds: Set<string>): Membership[] {
  const allLinks = getData().links
  const nodes = getData().nodes
  const perms: Membership[] = []
  const visited = new Set<string>()

  for (const link of allLinks) {
    const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
    const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
    if (roleIds.has(sid as string) && link.relationshipType === 'HAS_PERMISSION') {
      const target = findNode(tid as string, nodes)
      if (target && !visited.has(target.id)) {
        perms.push({ node: target, direct: false, relationshipType: 'HAS_PERMISSION' })
        visited.add(target.id)
      }
    }
  }

  return perms
}

function traverseAccessPaths(
  userId: string,
  _linkType: string,
  direction: 'source' | 'target',
  maxDepth = 8,
): AccessPath[] {
  const allLinks = getData().links
  const nodes = getData().nodes
  const paths: AccessPath[] = []
  const visited = new Set<string>()

  function dfs(
    currentId: string,
    depth: number,
    pathNodes: PathNode[],
    incomingRelType: string,
  ) {
    if (depth > maxDepth || visited.has(currentId)) return
    visited.add(currentId)

    const node = findNode(currentId, nodes)
    if (!node) return

    if (depth > 0) {
      pathNodes.push({
        id: node.id,
        displayName: node.displayName,
        nodeType: node.nodeType,
        relationshipType: incomingRelType,
        sourceSystem: node.sourceSystem,
        riskLevel: node.riskLevel,
      })
    }

    if (depth > 0 && currentId !== userId) {
      paths.push({
        nodes: [...pathNodes],
        direct: depth === 1,
      })
    }

    for (const link of allLinks) {
      const sid = typeof link.source === 'object' ? (link.source as any).id : link.source
      const tid = typeof link.target === 'object' ? (link.target as any).id : link.target
      const nextId = direction === 'target' ? tid : sid
      if (direction === 'target' ? (sid === currentId && nextId !== userId) : (tid === currentId && nextId !== userId)) {
        if (!visited.has(nextId as string)) {
          dfs(nextId as string, depth + 1, pathNodes, link.relationshipType)
        }
      }
    }

    visited.delete(currentId)
    pathNodes.pop()
  }

  dfs(userId, 0, [], '')
  return paths
}

function buildEffectiveAccess(userId: string): EffectiveAccess[] {
  const accessMap = new Map<string, EffectiveAccess>()

  const allPaths = traverseAccessPaths(userId, '', 'target', 8)

  for (const path of allPaths) {
    if (path.nodes.length === 0) continue
    const last = path.nodes[path.nodes.length - 1]
    if (
      last.nodeType === 'APPLICATION' ||
      last.nodeType === 'DATABASE' ||
      last.nodeType === 'BUSINESS_SERVICE' ||
      last.nodeType === 'HOST' ||
      last.nodeType === 'COMPUTER' ||
      last.nodeType === 'SUDO_POLICY' ||
      last.nodeType === 'SSH_KEY'
    ) {
      const key = `${last.nodeType}:${last.id}`
      const existing = accessMap.get(key)
      if (existing) {
        if (!existing.paths.some((p) => JSON.stringify(p.nodes) === JSON.stringify(path.nodes))) {
          existing.paths.push(path)
        }
      } else {
        accessMap.set(key, {
          type: last.nodeType,
          targetId: last.id,
          targetName: last.displayName,
          targetType: last.nodeType,
          riskLevel: last.riskLevel,
          sourceSystem: last.sourceSystem,
          paths: [path],
        })
      }
    }
  }

  return Array.from(accessMap.values())
}

function findCorrelatedIdentities(userId: string): CorrelatedIdentity[] {
  const user = findNode(userId, getData().nodes)
  if (!user) return []

  const correlated: CorrelatedIdentity[] = []
  const metadata = user.properties?.metadata as Record<string, unknown> | undefined
  const adUserId = metadata?.adUserId as string | undefined

  if (adUserId) {
    const adNode = findNode(adUserId, getData().nodes)
    if (adNode) {
      correlated.push({
        node: adNode,
        source: 'ACTIVE_DIRECTORY' as any,
        email: adNode.properties?.email as string,
        principalName: adNode.properties?.principalName as string,
      })
    }
  }

  if (user.sourceSystem === 'FREE_IPA' || user.sourceSystem === 'LINUX') {
    correlated.push({
      node: user,
      source: user.sourceSystem as any,
      email: user.properties?.email as string,
      principalName: user.properties?.principalName as string,
      uid: user.properties?.uid as number,
      locked: user.properties?.locked as boolean,
    })
  }

  return correlated
}

function computeDependencies(userId: string): { upstream: GraphNode[]; downstream: GraphNode[] } {
  const allLinks = getData().links
  const upstream = findLinkedNodes(userId, 'source', allLinks)
  const downstream = findLinkedNodes(userId, 'target', allLinks)
  return { upstream, downstream }
}

function findRiskFindings(userId: string): RiskFinding[] {
  const user = findNode(userId, getData().nodes)
  if (!user) return []

  const findings: RiskFinding[] = []
  const allLinks = getData().links
  const nodes = getData().nodes
  const status = user.properties?.status as string
  const riskLevel = user.riskLevel
  const sourceSystem = user.sourceSystem

  if (status === 'DISABLED') {
    const hasAccess = allLinks.some(
      (l) => l.source === userId || l.target === userId,
    )
    if (hasAccess) {
      findings.push({
        type: 'disabled_active_access',
        severity: 'high',
        title: 'Disabled account with active access',
        description: `User "${user.displayName}" is disabled but still has active group/role assignments.`,
        relatedNodes: [userId],
      })
    }
  }

  const groups = getMemberships(userId, 'MEMBER_OF', 'target').direct
  for (const g of groups) {
    const gname = g.node.displayName.toLowerCase()
    const isPrivileged =
      gname.includes('admin') ||
      gname.includes('enterprise') ||
      gname.includes('domain') ||
      gname.includes('sudo')

    if (isPrivileged) {
      const nested = getNestedGroupMemberships(userId, new Set([g.node.id]))
      if (nested.length > 0) {
        findings.push({
          type: 'privileged_nested',
          severity: 'critical',
          title: 'Privileged nested membership',
          description: `User "${user.displayName}" is a member of "${g.node.displayName}" through ${nested.length} nested group(s).`,
          relatedNodes: [g.node.id, ...nested.map((n) => n.node.id)],
        })
      }
    }
  }

  const svcAccounts = nodes.filter((n) =>
    (n.nodeType === 'SERVICE_ACCOUNT' || n.nodeType === 'MANAGED_SERVICE_ACCOUNT') &&
    allLinks.some((l) =>
      ((l.source === n.id && l.target === userId) || (l.target === n.id && l.source === userId)),
    ),
  )
  if (svcAccounts.length > 0) {
    findings.push({
      type: 'svc_account_association',
      severity: riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'critical' : 'medium',
      title: 'Service account association',
      description: `User "${user.displayName}" is associated with ${svcAccounts.length} service account(s).`,
      relatedNodes: svcAccounts.map((s) => s.id),
    })
  }

  const prodHosts = nodes.filter(
    (n) =>
      (n.nodeType === 'HOST' || n.nodeType === 'COMPUTER') &&
      n.properties?.environment === 'Production' &&
      allLinks.some((l) =>
        ((l.source === userId && l.target === n.id) || (l.target === userId && l.source === n.id)),
      ),
  )
  if (prodHosts.length > 0) {
    findings.push({
      type: 'production_host_access',
      severity: 'high',
      title: 'Production host access',
      description: `User "${user.displayName}" has access to ${prodHosts.length} production host(s).`,
      relatedNodes: prodHosts.map((h) => h.id),
    })
  }

  const financeApps = nodes.filter(
    (n) =>
      n.nodeType === 'APPLICATION' &&
      n.displayName.toLowerCase().includes('payment') &&
      findLinkedNodes(userId, 'target', allLinks).some((ln) => ln.id === n.id),
  )
  if (financeApps.length > 0) {
    findings.push({
      type: 'finance_app_access',
      severity: 'medium',
      title: 'Finance application access',
      description: `User "${user.displayName}" has access to financial applications.`,
      relatedNodes: financeApps.map((a) => a.id),
    })
  }

  if (sourceSystem === 'ACTIVE_DIRECTORY') {
    const linuxUsers = nodes.filter(
      (n) =>
        (n.nodeType === 'LINUX_USER') &&
        (n.properties?.metadata as Record<string, unknown>)?.['adUserId'] === userId,
    )
    if (linuxUsers.length > 0) {
      findings.push({
        type: 'cross_system_identity',
        severity: 'medium',
        title: 'Cross-system identity',
        description: `User "${user.displayName}" has ${linuxUsers.length} linked identity/identities in Linux/FreeIPA.`,
        relatedNodes: linuxUsers.map((l) => l.id),
      })
    }
  }

  return findings
}

export function buildUserProfile(userId: string): UserProfileData | null {
  const userNode = findNode(userId, getData().nodes)
  if (!userNode) return null

  const user: UserIdentity = {
    node: userNode,
    email: userNode.properties?.email as string,
    firstName: userNode.properties?.firstName as string,
    lastName: userNode.properties?.lastName as string,
    principalName: userNode.properties?.principalName as string,
    samAccountName: userNode.properties?.samAccountName as string,
    jobTitle: userNode.properties?.jobTitle as string,
    officeLocation: userNode.properties?.officeLocation as string,
    departmentId: userNode.properties?.departmentId as string,
    teams: userNode.properties?.teams as string[],
    managerId: userNode.properties?.managerId as string,
    mfaEnabled: userNode.properties?.mfaEnabled as boolean,
    locked: userNode.properties?.locked as boolean,
    sourceId: userNode.sourceId,
    employeeId: userNode.properties?.employeeId as string,
  }

  const { direct: directGroups, allIds: directGroupIds } = getMemberships(userId, 'MEMBER_OF', 'target')
  const indirectGroups = getNestedGroupMemberships(userId, directGroupIds)
  const roles = getRoles(userId)
  const roleIds = new Set(roles.map((r) => r.node.id))
  const permissions = getRolePermissions(roleIds)
  const effectiveAccess = buildEffectiveAccess(userId)
  const dependencies = computeDependencies(userId)
  const riskFindings = findRiskFindings(userId)
  const correlatedIdentities = findCorrelatedIdentities(userId)

  return {
    user,
    correlatedIdentities,
    directGroups,
    indirectGroups,
    roles,
    permissions,
    effectiveAccess,
    dependencies,
    riskFindings,
    rawProperties: userNode.properties ?? {},
  }
}
