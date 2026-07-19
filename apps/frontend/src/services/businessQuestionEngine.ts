import type { GraphNode, GraphLink, GraphData } from '../types/graph'
import type { QuestionResult } from '../types/businessQuestions'

let graphData: GraphData = { nodes: [], links: [] }

function getData(): GraphData {
  return graphData
}

function getNode(id: string): GraphNode | undefined {
  return getData().nodes.find((n) => n.id === id)
}

function getLinks(): GraphLink[] {
  return getData().links
}

function getNodes(): GraphNode[] {
  return getData().nodes
}

function linkSource(link: GraphLink): string {
  return typeof link.source === 'object' ? (link.source as any).id : link.source
}

function linkTarget(link: GraphLink): string {
  return typeof link.target === 'object' ? (link.target as any).id : link.target
}

function getLinkedSources(nodeId: string, relType?: string): GraphNode[] {
  return getLinks()
    .filter((l) => linkTarget(l) === nodeId && (!relType || l.relationshipType === relType))
    .map((l) => getNode(linkSource(l)))
    .filter((n): n is GraphNode => !!n)
}

function getLinkedTargets(nodeId: string, relType?: string): GraphNode[] {
  return getLinks()
    .filter((l) => linkSource(l) === nodeId && (!relType || l.relationshipType === relType))
    .map((l) => getNode(linkTarget(l)))
    .filter((n): n is GraphNode => !!n)
}

function collectAllNestedMembers(groupId: string, visited: Set<string> = new Set(), depth = 0): string[] {
  if (depth > 8 || visited.has(groupId)) return []
  visited.add(groupId)
  const members: Set<string> = new Set()
  const direct = getLinkedSources(groupId, 'MEMBER_OF')
  for (const m of direct) {
    if (m.nodeType === 'USER') members.add(m.id)
    else if (m.nodeType === 'GROUP') {
      members.add(m.id)
      const nested = collectAllNestedMembers(m.id, visited, depth + 1)
      nested.forEach((id) => members.add(id))
    }
  }
  return Array.from(members)
}

function collectUserAccessToApp(appId: string): { user: GraphNode; path: string[] }[] {
  const results: { user: GraphNode; path: string[] }[] = []
  const perms = getLinkedSources(appId, 'APPLIES_TO')
  for (const perm of perms) {
    const roles = getLinkedSources(perm.id, 'HAS_PERMISSION')
    for (const role of roles) {
      const users = getLinkedSources(role.id, 'HAS_PERMISSION')
      for (const user of users) {
        if (user.nodeType === 'USER') {
          results.push({
            user,
            path: [user.displayName, role.displayName, perm.displayName, getNode(appId)?.displayName || appId],
          })
        }
      }
    }
  }
  return results
}

function makeResult(questionId: string, title: string, summary: string): QuestionResult {
  return {
    questionId,
    title,
    summary,
    statistics: [],
    nodes: [],
    paths: [],
    relationships: [],
    riskFindings: [],
    affectedIdentities: [],
    affectedSystems: [],
    affectedBusinessServices: [],
    rawData: [],
  }
}

function addStat(r: QuestionResult, label: string, value: number, color?: string) {
  r.statistics.push({ label, value, color })
}

function addNode(r: QuestionResult, node: GraphNode) {
  if (!r.nodes.find((n) => n.id === node.id)) r.nodes.push(node)
}

function addIdentity(r: QuestionResult, node: GraphNode) {
  if (!r.affectedIdentities.find((e) => e.id === node.id)) {
    r.affectedIdentities.push({ id: node.id, name: node.displayName, type: node.nodeType })
  }
}

function addSystem(r: QuestionResult, node: GraphNode) {
  if (!r.affectedSystems.find((e) => e.id === node.id)) {
    r.affectedSystems.push({ id: node.id, name: node.displayName, type: node.nodeType })
  }
}

function addService(r: QuestionResult, node: GraphNode) {
  if (!r.affectedBusinessServices.find((e) => e.id === node.id)) {
    r.affectedBusinessServices.push({
      id: node.id, name: node.displayName, type: node.nodeType,
      detail: node.properties?.criticality as string,
    })
  }
}

function addPath(r: QuestionResult, nodeIds: string[], rels: string[]) {
  const pathNodes = nodeIds.map((id) => getNode(id)).filter((n): n is GraphNode => !!n)
  if (pathNodes.length > 0) {
    r.paths.push({
      nodes: pathNodes.map((n) => ({ id: n.id, displayName: n.displayName, nodeType: n.nodeType })),
      relationships: rels,
    })
  }
}

// --- Query Implementations ---

function queryWhoAccessHost(hostId: string): QuestionResult {
  const host = getNode(hostId)
  const r = makeResult('who-access-host', `Who can access ${host?.displayName || hostId}?`, '')
  if (!host || (host.nodeType !== 'HOST' && host.nodeType !== 'COMPUTER')) {
    r.summary = 'Host not found.'
    return r
  }
  addNode(r, host)

  const authUsers = getLinkedSources(hostId, 'AUTHENTICATES_TO')
  for (const u of authUsers) {
    addNode(r, u)
    addIdentity(r, u)
  }

  for (const sp of getNodes().filter((n) => n.nodeType === 'SUDO_POLICY')) {
    const hostIds = sp.properties?.hostIds as string[] | undefined
    if (!hostIds?.includes(hostId)) continue
    const groups = getLinkedSources(sp.id, 'HAS_ACCESS')
    for (const g of groups) {
      addNode(r, g)
      const members = getLinkedSources(g.id, 'MEMBER_OF')
      for (const m of members) {
        if (m.nodeType === 'LINUX_USER') {
          addNode(r, m)
          addIdentity(r, m)
          addPath(r, [m.id, g.id, sp.id, hostId], ['MEMBER_OF', 'HAS_ACCESS', 'APPLIES_TO'])
        }
      }
    }
  }

  addStat(r, 'Total Identities', authUsers.length + r.nodes.filter((n) => n.nodeType === 'LINUX_USER').length)
  addStat(r, 'AD Users', authUsers.filter((u) => u.sourceSystem === 'ACTIVE_DIRECTORY').length, 'blue')
  addStat(r, 'Linux Users', r.nodes.filter((n) => n.nodeType === 'LINUX_USER').length, 'teal')
  addStat(r, 'Groups', r.nodes.filter((n) => n.nodeType === 'LINUX_GROUP').length, 'green')

  r.summary = `Found ${r.affectedIdentities.length} identities that can access ${host.displayName}.`
  return r
}

function queryWhoAccessApp(appId: string): QuestionResult {
  const app = getNode(appId)
  const r = makeResult('who-access-app', `Who has access to ${app?.displayName || appId}?`, '')
  if (!app || app.nodeType !== 'APPLICATION') {
    r.summary = 'Application not found.'
    return r
  }
  addNode(r, app)

  const accessEntries = collectUserAccessToApp(appId)
  const seenUsers = new Set<string>()
  for (const entry of accessEntries) {
    if (!seenUsers.has(entry.user.id)) {
      seenUsers.add(entry.user.id)
      addNode(r, entry.user)
      addIdentity(r, entry.user)
    }
    addPath(r, entry.path.map((_, i) => {
      if (i === 0) return entry.user.id
      return ''
    }), entry.path.slice(1))
  }

  addStat(r, 'Users', seenUsers.size, 'blue')
  addStat(r, 'Access Paths', accessEntries.length, 'cyan')

  r.summary = `Found ${seenUsers.size} users with access to ${app.displayName} via ${accessEntries.length} permission paths.`
  return r
}

function queryDomainAdmins(): QuestionResult {
  const r = makeResult('domain-admins', 'Which users are Domain Admins?', '')
  const daGroup = getNodes().find((n) => n.id === 'group-domain-admins')
  if (!daGroup) { r.summary = 'Domain Admins group not found.'; return r }

  addNode(r, daGroup)
  const members = getLinkedSources(daGroup.id, 'MEMBER_OF').filter((n) => n.nodeType === 'USER')
  for (const m of members) {
    addNode(r, m)
    addIdentity(r, m)
    addPath(r, [m.id, daGroup.id], ['MEMBER_OF'])
  }

  addStat(r, 'Direct Members', members.length, 'red')
  r.summary = `Found ${members.length} direct Domain Admin members.`
  return r
}

function queryInheritDomainAdmin(): QuestionResult {
  const r = makeResult('inherit-domain-admin', 'Which users inherit Domain Admin?', '')
  const daGroup = getNodes().find((n) => n.id === 'group-domain-admins')
  if (!daGroup) { r.summary = 'Domain Admins group not found.'; return r }
  addNode(r, daGroup)

  const eaGroup = getNodes().find((n) => n.id === 'group-enterprise-admins')
  if (eaGroup) addNode(r, eaGroup)

  const visited = new Set<string>()
  const allMembers = collectAllNestedMembers(daGroup.id, visited)
  const users = allMembers.map((id) => getNode(id)).filter((n): n is GraphNode => !!n && n.nodeType === 'USER')

  for (const u of users) {
    addNode(r, u)
    addIdentity(r, u)
  }

  const groupsInChain = allMembers.map((id) => getNode(id)).filter((n): n is GraphNode => !!n && n.nodeType === 'GROUP')
  for (const g of groupsInChain) addNode(r, g)

  addStat(r, 'Total Users (direct + inherited)', users.length, 'red')
  addStat(r, 'Groups in Chain', groupsInChain.length, 'orange')
  r.summary = `Found ${users.length} users with direct or inherited Domain Admin (across ${groupsInChain.length} groups).`
  return r
}

function queryProductionAccess(): QuestionResult {
  const r = makeResult('production-access', 'Which users have Production access?', '')
  const prodHosts = getNodes().filter(
    (n) => (n.nodeType === 'HOST' || n.nodeType === 'COMPUTER') &&
      ((n.properties?.environment as string) === 'Production' || n.displayName.includes('prod')),
  )
  const prodApps = getNodes().filter(
    (n) => n.nodeType === 'APPLICATION' && (n.properties?.environment as string) === 'Production',
  )
  const prodGroup = getNodes().find((n) => n.id === 'group-app-prod-access')

  const seenUsers = new Set<string>()
  for (const host of prodHosts) {
    addNode(r, host)
    addSystem(r, host)
    const users = getLinkedSources(host.id, 'AUTHENTICATES_TO')
    for (const u of users) {
      if (u.nodeType === 'USER' && !seenUsers.has(u.id)) {
        seenUsers.add(u.id); addNode(r, u); addIdentity(r, u)
      }
    }
  }

  for (const app of prodApps) {
    addNode(r, app)
    addSystem(r, app)
    const entries = collectUserAccessToApp(app.id)
    for (const e of entries) {
      if (!seenUsers.has(e.user.id)) {
        seenUsers.add(e.user.id); addNode(r, e.user); addIdentity(r, e.user)
      }
    }
  }

  if (prodGroup) {
    addNode(r, prodGroup)
    const members = getLinkedSources(prodGroup.id, 'MEMBER_OF').filter((n) => n.nodeType === 'USER')
    for (const m of members) {
      if (!seenUsers.has(m.id)) {
        seenUsers.add(m.id); addNode(r, m); addIdentity(r, m)
      }
    }
    const nested = getLinkedSources(prodGroup.id, 'MEMBER_OF').filter((n) => n.nodeType === 'GROUP')
    for (const ng of nested) {
      const nestedMembers = getLinkedSources(ng.id, 'MEMBER_OF').filter((n) => n.nodeType === 'USER')
      for (const nm of nestedMembers) {
        if (!seenUsers.has(nm.id)) {
          seenUsers.add(nm.id); addNode(r, nm); addIdentity(r, nm)
        }
      }
    }
  }

  addStat(r, 'Users', seenUsers.size, 'blue')
  addStat(r, 'Production Hosts', prodHosts.length, 'purple')
  addStat(r, 'Production Apps', prodApps.length, 'cyan')
  r.summary = `Found ${seenUsers.size} users with access to ${prodHosts.length} production hosts and ${prodApps.length} production apps.`
  return r
}

function queryFinanceAppAccess(): QuestionResult {
  const r = makeResult('finance-app-access', 'Which users have Finance application access?', '')
  const financeApps = getNodes().filter(
    (n) => n.nodeType === 'APPLICATION' &&
      (n.displayName.toLowerCase().includes('payment') || n.displayName.toLowerCase().includes('finance')),
  )

  const seenUsers = new Set<string>()
  for (const app of financeApps) {
    addNode(r, app)
    addSystem(r, app)
    const entries = collectUserAccessToApp(app.id)
    for (const e of entries) {
      if (!seenUsers.has(e.user.id)) {
        seenUsers.add(e.user.id); addNode(r, e.user); addIdentity(r, e.user)
      }
    }
  }

  addStat(r, 'Users', seenUsers.size, 'blue')
  addStat(r, 'Finance Apps', financeApps.length, 'pink')
  r.summary = `Found ${seenUsers.size} users with access to ${financeApps.length} finance application(s).`
  return r
}

function querySudoUsers(): QuestionResult {
  const r = makeResult('sudo-users', 'Which users have sudo?', '')
  const sudoPolicies = getNodes().filter((n) => n.nodeType === 'SUDO_POLICY')
  const seenUsers = new Set<string>()

  for (const sp of sudoPolicies) {
    addNode(r, sp)
    addSystem(r, sp)
    const groups = getLinkedSources(sp.id, 'HAS_ACCESS')
    for (const g of groups) {
      addNode(r, g)
      const members = getLinkedSources(g.id, 'MEMBER_OF')
      for (const m of members) {
        if (m.nodeType === 'LINUX_USER' && !seenUsers.has(m.id)) {
          seenUsers.add(m.id)
          addNode(r, m)
          addIdentity(r, m)
          addPath(r, [m.id, g.id, sp.id], ['MEMBER_OF', 'HAS_ACCESS'])
        }
      }
    }
  }

  addStat(r, 'Sudo Users', seenUsers.size, 'red')
  addStat(r, 'Sudo Policies', sudoPolicies.length, 'orange')
  addStat(r, 'Granting Groups', r.nodes.filter((n) => n.nodeType === 'LINUX_GROUP').length, 'green')
  r.summary = `Found ${seenUsers.size} Linux users with sudo privileges across ${sudoPolicies.length} policies.`
  return r
}

function querySudoGroups(): QuestionResult {
  const r = makeResult('sudo-groups', 'Which Linux groups grant sudo?', '')
  const sudoPolicies = getNodes().filter((n) => n.nodeType === 'SUDO_POLICY')
  const seenGroups = new Set<string>()

  for (const sp of sudoPolicies) {
    addNode(r, sp)
    const groups = getLinkedSources(sp.id, 'HAS_ACCESS')
    for (const g of groups) {
      if (g.nodeType === 'LINUX_GROUP' && !seenGroups.has(g.id)) {
        seenGroups.add(g.id); addNode(r, g); addIdentity(r, g)
        addPath(r, [g.id, sp.id], ['HAS_ACCESS'])
      }
    }
  }

  for (const g of getNodes().filter((n) => n.nodeType === 'LINUX_GROUP' && n.properties?.gid === 10)) {
    if (!seenGroups.has(g.id)) { seenGroups.add(g.id); addNode(r, g); addIdentity(r, g) }
  }

  addStat(r, 'Sudo Groups', seenGroups.size, 'red')
  addStat(r, 'Sudo Policies', sudoPolicies.length, 'orange')
  r.summary = `Found ${seenGroups.size} Linux groups that grant sudo access.`
  return r
}

function queryPrivilegedServiceAccounts(): QuestionResult {
  const r = makeResult('privileged-service-accounts', 'Which service accounts are privileged?', '')
  const allSvc = getNodes().filter((n) =>
    n.nodeType === 'SERVICE_ACCOUNT' || n.nodeType === 'MANAGED_SERVICE_ACCOUNT',
  )

  for (const svc of allSvc) {
    addNode(r, svc)
    addIdentity(r, svc)
    const links = getLinks().filter((l) => linkSource(l) === svc.id || linkTarget(l) === svc.id)
    const isPrivileged = links.length > 1 || svc.riskLevel === 'HIGH' || svc.riskLevel === 'CRITICAL'

    if (isPrivileged || true) {
      r.riskFindings.push({
        severity: svc.riskLevel === 'CRITICAL' ? 'critical' : svc.riskLevel === 'HIGH' ? 'high' : 'medium',
        title: `${svc.displayName} (${svc.nodeType})`,
        description: `${svc.nodeType} with ${links.length} relationship(s). Risk: ${svc.riskLevel}.`,
        count: 1,
      })
    }
  }

  addStat(r, 'Service Accounts', allSvc.length, 'purple')
  addStat(r, 'Managed Service Accounts', allSvc.filter((n) => n.nodeType === 'MANAGED_SERVICE_ACCOUNT').length, 'violet')
  r.summary = `Found ${allSvc.length} service accounts. ${r.riskFindings.length} have elevated risk.`
  return r
}

function querySshUsers(): QuestionResult {
  const r = makeResult('ssh-users', 'Which users have SSH access?', '')
  const sshKeys = getNodes().filter((n) => n.nodeType === 'SSH_KEY')
  const seenUsers = new Set<string>()

  for (const key of sshKeys) {
    addNode(r, key)
    const ownerId = key.properties?.ownerId as string
    const owner = getNode(ownerId)
    if (owner && owner.nodeType === 'LINUX_USER' && !seenUsers.has(owner.id)) {
      seenUsers.add(owner.id)
      addNode(r, owner)
      addIdentity(r, owner)
      addPath(r, [owner.id, key.id], ['OWNS'])
    }
  }

  addStat(r, 'SSH Users', seenUsers.size, 'green')
  addStat(r, 'SSH Keys', sshKeys.length, 'yellow')
  r.summary = `Found ${seenUsers.size} users with SSH keys (${sshKeys.length} keys total).`
  return r
}

function queryOrphanGroups(): QuestionResult {
  const r = makeResult('orphan-groups', 'Which orphan groups exist?', '')
  const groups = getNodes().filter((n) => n.nodeType === 'GROUP' || n.nodeType === 'LINUX_GROUP')

  for (const g of groups) {
    const members = getLinkedSources(g.id, 'MEMBER_OF')
    const hasMemberIds = (g.properties?.memberIds as string[])?.length > 0
    if (members.length === 0 && !hasMemberIds) {
      addNode(r, g)
      addIdentity(r, g)
    }
  }

  addStat(r, 'Orphan Groups', r.nodes.length, 'yellow')
  addStat(r, 'Total Groups', groups.length, 'gray')
  r.summary = `Found ${r.nodes.length} orphan groups with no members.`
  return r
}

function queryDisabledUsersAccess(): QuestionResult {
  const r = makeResult('disabled-users-access', 'Which disabled users still have access?', '')
  const users = getNodes().filter(
    (n) => n.nodeType === 'USER' && n.properties?.status === 'DISABLED',
  )

  for (const u of users) {
    const links = getLinks().filter((l) => linkSource(l) === u.id || linkTarget(l) === u.id)
    const hasAccess = links.length > 0
    if (hasAccess) {
      addNode(r, u)
      addIdentity(r, u)
      r.riskFindings.push({
        severity: 'high',
        title: `${u.displayName} is disabled but has ${links.length} active relationship(s)`,
        description: `User ${u.displayName} (${u.id}) has status DISABLED but maintains ${links.length} graph relationships.`,
        count: 1,
      })
    }
  }

  addStat(r, 'Disabled Users with Access', r.nodes.length, 'red')
  addStat(r, 'Total Disabled Users', users.length, 'orange')
  r.summary = `Found ${r.nodes.length} disabled users who still have active access.`
  return r
}

function queryCrossSystemAccounts(): QuestionResult {
  const r = makeResult('cross-system-accounts', 'Which accounts exist in multiple systems?', '')
  const linuxUsers = getNodes().filter((n) => n.nodeType === 'LINUX_USER')

  for (const lu of linuxUsers) {
    const metadata = lu.properties?.metadata as Record<string, unknown> | undefined
    const adUserId = metadata?.adUserId as string | undefined
    if (adUserId) {
      addNode(r, lu)
      addIdentity(r, lu)
      const adUser = getNode(adUserId)
      if (adUser) {
        addNode(r, adUser)
        addIdentity(r, adUser)
        addPath(r, [adUserId, lu.id], ['LINKED_TO'])
      }
    }
  }

  addStat(r, 'Cross-system Identities', r.nodes.filter((n) => n.nodeType === 'LINUX_USER').length, 'teal')
  addStat(r, 'Linked AD Users', r.nodes.filter((n) => n.nodeType === 'USER').length, 'blue')
  r.summary = `Found ${r.nodes.length} identities linked across multiple systems.`
  return r
}

function queryHighestRiskIdentities(): QuestionResult {
  const r = makeResult('highest-risk-identities', 'Which identities have the highest risk?', '')
  const users = getNodes().filter((n) =>
    n.nodeType === 'USER' || n.nodeType === 'LINUX_USER' || n.nodeType === 'SERVICE_ACCOUNT',
  )
  const byRisk = { CRITICAL: [] as GraphNode[], HIGH: [] as GraphNode[], MEDIUM: [] as GraphNode[] }
  for (const u of users) {
    if (u.riskLevel === 'CRITICAL') byRisk.CRITICAL.push(u)
    else if (u.riskLevel === 'HIGH') byRisk.HIGH.push(u)
    else if (u.riskLevel === 'MEDIUM') byRisk.MEDIUM.push(u)
  }

  for (const u of [...byRisk.CRITICAL, ...byRisk.HIGH, ...byRisk.MEDIUM]) {
    addNode(r, u)
    addIdentity(r, u)
  }

  addStat(r, 'Critical Risk', byRisk.CRITICAL.length, 'red')
  addStat(r, 'High Risk', byRisk.HIGH.length, 'orange')
  addStat(r, 'Medium Risk', byRisk.MEDIUM.length, 'yellow')

  if (byRisk.CRITICAL.length > 0) {
    r.riskFindings.push({
      severity: 'critical',
      title: 'Critical risk identities',
      description: `${byRisk.CRITICAL.length} identity/identities at CRITICAL risk level.`,
      count: byRisk.CRITICAL.length,
    })
  }
  if (byRisk.HIGH.length > 0) {
    r.riskFindings.push({
      severity: 'high',
      title: 'High risk identities',
      description: `${byRisk.HIGH.length} identity/identities at HIGH risk level.`,
      count: byRisk.HIGH.length,
    })
  }

  r.summary = `Found ${byRisk.CRITICAL.length + byRisk.HIGH.length + byRisk.MEDIUM.length} identities with elevated risk.`
  return r
}

function queryBsvcDependOnHost(hostId: string): QuestionResult {
  const host = getNode(hostId)
  const r = makeResult('bsvc-depend-on-host', `Business services depending on ${host?.displayName || hostId}`, '')
  if (!host) { r.summary = 'Host not found.'; return r }
  addNode(r, host)

  const dbs = getNodes().filter(
    (n) => n.nodeType === 'DATABASE' && (n.properties?.hostId as string) === hostId,
  )
  for (const db of dbs) {
    addNode(r, db)
    addSystem(r, db)
    const apps = getLinkedSources(db.id, 'CONNECTS_TO').filter((n) => n.nodeType === 'APPLICATION')
    for (const app of apps) {
      addNode(r, app)
      addSystem(r, app)
      const services = getLinkedTargets(app.id, 'PART_OF').filter((n) => n.nodeType === 'BUSINESS_SERVICE')
      for (const svc of services) {
        addNode(r, svc)
        addService(r, svc)
        addPath(r, [hostId, db.id, app.id, svc.id], ['HOSTS', 'CONNECTS_TO', 'PART_OF'])
      }
    }
  }

  addStat(r, 'Business Services', r.affectedBusinessServices.length, 'red')
  addStat(r, 'Applications', r.affectedSystems.filter((e) => e.type === 'APPLICATION').length, 'cyan')
  addStat(r, 'Databases', r.affectedSystems.filter((e) => e.type === 'DATABASE').length, 'pink')
  r.summary = `Found ${r.affectedBusinessServices.length} business services depending on ${host.displayName}.`
  return r
}

function queryHostCompromiseImpact(hostId: string): QuestionResult {
  const host = getNode(hostId)
  const r = makeResult('host-compromise-impact', `Impact if ${host?.displayName || hostId} is compromised`, '')
  if (!host) { r.summary = 'Host not found.'; return r }
  addNode(r, host)

  const dbs = getNodes().filter(
    (n) => n.nodeType === 'DATABASE' && (n.properties?.hostId as string) === hostId,
  )
  for (const db of dbs) {
    addNode(r, db); addSystem(r, db)
    const apps = getLinkedSources(db.id, 'CONNECTS_TO').filter((n) => n.nodeType === 'APPLICATION')
    for (const app of apps) {
      addNode(r, app); addSystem(r, app)
      const services = getLinkedTargets(app.id, 'PART_OF').filter((n) => n.nodeType === 'BUSINESS_SERVICE')
      for (const svc of services) { addNode(r, svc); addService(r, svc) }
    }
  }

  const users = getLinkedSources(hostId, 'AUTHENTICATES_TO').filter((n) => n.nodeType === 'USER')
  for (const u of users) addIdentity(r, u)

  addStat(r, 'Applications at Risk', r.affectedSystems.filter((e) => e.type === 'APPLICATION').length, 'cyan')
  addStat(r, 'Databases at Risk', r.affectedSystems.filter((e) => e.type === 'DATABASE').length, 'pink')
  addStat(r, 'Business Services at Risk', r.affectedBusinessServices.length, 'red')
  addStat(r, 'Users with Access', users.length, 'blue')

  r.summary = `Compromise of ${host.displayName} could affect ${r.affectedSystems.length} systems and ${r.affectedBusinessServices.length} business services.`
  return r
}

function queryGroupRemovalImpact(groupId: string): QuestionResult {
  const group = getNode(groupId)
  const r = makeResult('group-removal-impact', `Impact if ${group?.displayName || groupId} is removed`, '')
  if (!group || (group.nodeType !== 'GROUP' && group.nodeType !== 'LINUX_GROUP')) {
    r.summary = 'Group not found.'
    return r
  }
  addNode(r, group)

  const members = getLinkedSources(group.id, 'MEMBER_OF').filter((n) => n.nodeType === 'USER')
  for (const m of members) { addNode(r, m); addIdentity(r, m) }

  const subGroups = getLinkedSources(group.id, 'MEMBER_OF').filter((n) => n.nodeType === 'GROUP')
  for (const sg of subGroups) { addNode(r, sg); addIdentity(r, sg) }

  const roles = getLinkedTargets(group.id, 'HAS_PERMISSION').filter((n) => n.nodeType === 'ROLE')
  for (const role of roles) {
    addNode(r, role)
    const perms = getLinkedTargets(role.id, 'HAS_PERMISSION').filter((n) => n.nodeType === 'PERMISSION')
    for (const perm of perms) {
      addNode(r, perm)
      const apps = getLinkedTargets(perm.id, 'APPLIES_TO').filter((n) => n.nodeType === 'APPLICATION')
      for (const app of apps) {
        addNode(r, app); addSystem(r, app)
        addPath(r, [group.id, role.id, perm.id, app.id], ['HAS_PERMISSION', 'HAS_PERMISSION', 'APPLIES_TO'])
      }
    }
  }

  addStat(r, 'Direct Users Affected', members.length, 'blue')
  addStat(r, 'Sub-groups Affected', subGroups.length, 'orange')
  addStat(r, 'Roles Lost', roles.length, 'purple')
  addStat(r, 'Applications Affected', r.affectedSystems.filter((e) => e.type === 'APPLICATION').length, 'cyan')

  r.summary = `Removing ${group.displayName} affects ${members.length} users, ${subGroups.length} sub-groups, and ${r.affectedSystems.length} application(s).`
  return r
}

function queryAppRemovalUserImpact(appId: string): QuestionResult {
  const app = getNode(appId)
  const r = makeResult('app-removal-user-impact', `Users who lose access if ${app?.displayName || appId} is removed`, '')
  if (!app || app.nodeType !== 'APPLICATION') { r.summary = 'Application not found.'; return r }
  addNode(r, app)

  const entries = collectUserAccessToApp(appId)
  const seenUsers = new Set<string>()
  for (const e of entries) {
    if (!seenUsers.has(e.user.id)) {
      seenUsers.add(e.user.id); addNode(r, e.user); addIdentity(r, e.user)
    }
    addPath(r, [e.user.id, '', '', appId], e.path.slice(1))
  }

  const bsvcs = getLinkedTargets(appId, 'PART_OF').filter((n) => n.nodeType === 'BUSINESS_SERVICE')
  for (const svc of bsvcs) { addNode(r, svc); addService(r, svc) }

  addStat(r, 'Users Losing Access', seenUsers.size, 'red')
  addStat(r, 'Business Services Affected', bsvcs.length, 'orange')

  r.summary = `Removing ${app.displayName} would cause ${seenUsers.size} users to lose access.`
  return r
}

function queryNestedGroupMembership(): QuestionResult {
  const r = makeResult('nested-group-membership', 'Which groups have nested membership?', '')
  const groups = getNodes().filter((n) => n.nodeType === 'GROUP')

  for (const g of groups) {
    const nested = getLinkedSources(g.id, 'MEMBER_OF').filter((n) => n.nodeType === 'GROUP')
    if (nested.length > 0) {
      addNode(r, g)
      for (const ng of nested) {
        addNode(r, ng)
        addPath(r, [g.id, ng.id], ['MEMBER_OF'])
      }
    }
  }

  addStat(r, 'Groups with Nesting', new Set(r.paths.map((p) => p.nodes[0]?.id)).size, 'orange')
  addStat(r, 'Total Nested Groups', r.nodes.filter((n) => n.nodeType === 'GROUP').length, 'yellow')
  r.summary = `Found ${r.nodes.length} groups involved in nested membership.`
  return r
}

function queryDirectPrivilegeRoles(): QuestionResult {
  const r = makeResult('direct-privilege-roles', 'Which roles grant direct privileges?', '')
  const roles = getNodes().filter((n) => n.nodeType === 'ROLE')

  for (const role of roles) {
    const perms = getLinkedTargets(role.id, 'HAS_PERMISSION').filter((n) => n.nodeType === 'PERMISSION')
    const apps: string[] = []
    for (const perm of perms) {
      const appNodes = getLinkedTargets(perm.id, 'APPLIES_TO').filter((n) => n.nodeType === 'APPLICATION')
      appNodes.forEach((a) => { if (!apps.includes(a.displayName)) apps.push(a.displayName) })
    }
    r.rawData.push({
      role: role.displayName,
      permissions: perms.length,
      applications: apps.join(', '),
    })
    addNode(r, role)
    perms.forEach((p) => addNode(r, p))
  }

  addStat(r, 'Roles', roles.length, 'orange')
  r.summary = `Found ${roles.length} roles with direct permission assignments.`
  return r
}

function queryAdUsersLinuxAccess(): QuestionResult {
  const r = makeResult('ad-users-linux-access', 'Which AD users have Linux access?', '')
  const adUsers = getNodes().filter((n) => n.nodeType === 'USER' && n.sourceSystem === 'ACTIVE_DIRECTORY')

  for (const au of adUsers) {
    const linuxLinks = getNodes().filter(
      (ln) => ln.nodeType === 'LINUX_USER' &&
        (ln.properties?.metadata as Record<string, unknown>)?.['adUserId'] === au.id,
    )
    if (linuxLinks.length > 0) {
      addNode(r, au); addIdentity(r, au)
      for (const lu of linuxLinks) { addNode(r, lu); addIdentity(r, lu) }
    }
  }

  addStat(r, 'AD Users with Linux Access', r.nodes.filter((n) => n.nodeType === 'USER').length, 'blue')
  addStat(r, 'Linked Linux Users', r.nodes.filter((n) => n.nodeType === 'LINUX_USER').length, 'teal')
  r.summary = `Found ${r.nodes.filter((n) => n.nodeType === 'USER').length} AD users with Linux access.`
  return r
}

function queryHostsNoApps(): QuestionResult {
  const r = makeResult('hosts-no-apps', 'Which hosts have no applications?', '')
  const hosts = getNodes().filter((n) => n.nodeType === 'HOST' || n.nodeType === 'COMPUTER')

  for (const host of hosts) {
    const dbsOnHost = getNodes().filter(
      (db) => db.nodeType === 'DATABASE' && (db.properties?.hostId as string) === host.id,
    )
    const appsUsingHost = dbsOnHost.some((db) =>
      getLinks().some((l) => l.relationshipType === 'CONNECTS_TO' && linkTarget(l) === db.id),
    )
    const msvcOnHost = getLinks().some(
      (l) => l.relationshipType === 'RUNS_ON' && linkTarget(l) === host.id,
    )
    if (!appsUsingHost && !msvcOnHost) {
      addNode(r, host); addSystem(r, host)
    }
  }

  addStat(r, 'Hosts without Apps', r.nodes.length, 'purple')
  addStat(r, 'Total Hosts', hosts.length, 'gray')
  r.summary = `Found ${r.nodes.length} hosts with no applications.`
  return r
}

function queryUsersInMultipleGroups(): QuestionResult {
  const r = makeResult('users-in-multiple-groups', 'Which users belong to the most groups?', '')
  const users = getNodes().filter((n) => n.nodeType === 'USER')
  const groups = getNodes().filter((n) => n.nodeType === 'GROUP')

  const userGroupCount: { user: GraphNode; count: number }[] = []
  for (const u of users) {
    const count = groups.filter((g) => {
      const memberIds = g.properties?.memberIds as string[] | undefined
      if (memberIds?.includes(u.id)) return true
      return getLinks().some((l) => linkTarget(l) === g.id && linkSource(l) === u.id && l.relationshipType === 'MEMBER_OF')
    }).length
    if (count > 0) userGroupCount.push({ user: u, count })
  }

  userGroupCount.sort((a, b) => b.count - a.count)
  for (const ugc of userGroupCount) {
    r.rawData.push({ user: ugc.user.displayName, groups: ugc.count })
    addNode(r, ugc.user)
    addIdentity(r, ugc.user)
  }

  addStat(r, 'Users in Groups', userGroupCount.length, 'blue')
  const max = userGroupCount[0]
  if (max) addStat(r, `Most: ${max.user.displayName}`, max.count, 'orange')
  r.summary = `Found ${userGroupCount.length} users in groups. Max group count: ${max ? max.count : 0}.`
  return r
}

function queryCriticalApplications(): QuestionResult {
  const r = makeResult('critical-applications', 'Which applications are business-critical?', '')
  const apps = getNodes().filter((n) => n.nodeType === 'APPLICATION')

  for (const app of apps) {
    const services = getLinkedTargets(app.id, 'PART_OF').filter((n) => n.nodeType === 'BUSINESS_SERVICE')
    const isCritical = services.some((s) =>
      (s.properties?.criticality as string)?.toLowerCase() === 'critical',
    ) || app.properties?.environment === 'Production'

    if (isCritical) {
      addNode(r, app); addSystem(r, app)
      services.forEach((s) => { addNode(r, s); addService(r, s) })
      r.rawData.push({
        application: app.displayName,
        environment: app.properties?.environment as string,
        services: services.map((s) => s.displayName).join(', '),
        critical: true,
      })
    }
  }

  addStat(r, 'Critical Applications', r.affectedSystems.length, 'red')
  addStat(r, 'Supporting Services', r.affectedBusinessServices.length, 'orange')
  r.summary = `Found ${r.affectedSystems.length} business-critical applications.`
  return r
}

function querySudoWildcardRules(): QuestionResult {
  const r = makeResult('sudo-wildcard-rules', 'Which sudo rules are wildcard?', '')
  const sudoPolicies = getNodes().filter((n) => n.nodeType === 'SUDO_POLICY')

  for (const sp of sudoPolicies) {
    const commands = sp.properties?.commands as string[] | undefined
    const isWildcard = commands?.includes('ALL')
    if (isWildcard) {
      addNode(r, sp); addSystem(r, sp)
      r.riskFindings.push({
        severity: 'critical',
        title: `${sp.displayName} grants ALL commands`,
        description: `Wildcard sudo rule on ${(sp.properties?.hostIds as string[])?.join(', ') || 'unknown hosts'}.`,
        count: 1,
      })
    }
  }

  const groups = getNodes().filter((n) => n.nodeType === 'LINUX_GROUP')
  const wildcardGroups = groups.filter((g) =>
    sudoPolicies.some((sp) => {
      const hostIds = sp.properties?.hostIds as string[] | undefined
      const commands = sp.properties?.commands as string[] | undefined
      return hostIds?.length && commands?.includes('ALL') &&
        getLinks().some((l) => linkSource(l) === g.id && linkTarget(l) === sp.id && l.relationshipType === 'HAS_ACCESS')
    }),
  )

  addStat(r, 'Wildcard Rules', r.nodes.length, 'red')
  addStat(r, 'Groups Affected', wildcardGroups.length, 'orange')
  r.summary = `Found ${r.nodes.length} wildcard sudo rules affecting ${wildcardGroups.length} groups.`
  return r
}

function queryPrivilegedGroupMembers(): QuestionResult {
  const r = makeResult('privileged-group-members', 'Which users are in privileged groups?', '')
  const privilegedGroupNames = ['admin', 'enterprise', 'sudo', 'domain']
  const groups = getNodes().filter((n) =>
    n.nodeType === 'GROUP' &&
    privilegedGroupNames.some((name) => n.displayName.toLowerCase().includes(name)),
  )

  const seenUsers = new Set<string>()
  for (const g of groups) {
    addNode(r, g)
    const members = getLinkedSources(g.id, 'MEMBER_OF').filter((n) => n.nodeType === 'USER')
    for (const m of members) {
      if (!seenUsers.has(m.id)) {
        seenUsers.add(m.id); addNode(r, m); addIdentity(r, m)
      }
    }
  }

  addStat(r, 'Privileged Groups', groups.length, 'red')
  addStat(r, 'Members', seenUsers.size, 'orange')
  r.summary = `Found ${seenUsers.size} users across ${groups.length} privileged groups.`
  return r
}

function queryOrphanServiceAccounts(): QuestionResult {
  const r = makeResult('orphan-service-accounts', 'Which service accounts are orphaned?', '')
  const svcAccounts = getNodes().filter((n) =>
    n.nodeType === 'SERVICE_ACCOUNT' || n.nodeType === 'MANAGED_SERVICE_ACCOUNT',
  )

  for (const svc of svcAccounts) {
    const links = getLinks().filter((l) => linkSource(l) === svc.id || linkTarget(l) === svc.id)
    const hasManager = svc.properties?.managedBy
    if (links.length <= 1 && !hasManager) {
      addNode(r, svc); addIdentity(r, svc)
    }
  }

  addStat(r, 'Orphaned Service Accounts', r.nodes.length, 'yellow')
  addStat(r, 'Total Service Accounts', svcAccounts.length, 'gray')
  r.summary = `Found ${r.nodes.length} orphaned service accounts.`
  return r
}

function queryAppUserCount(): QuestionResult {
  const r = makeResult('app-user-count', 'How many users per application?', '')
  const apps = getNodes().filter((n) => n.nodeType === 'APPLICATION')

  for (const app of apps) {
    const entries = collectUserAccessToApp(app.id)
    const uniqueUsers = new Set(entries.map((e) => e.user.id))
    r.rawData.push({
      application: app.displayName,
      uniqueUsers: uniqueUsers.size,
      totalPaths: entries.length,
    })
  }

  addStat(r, 'Applications', apps.length, 'cyan')
  r.summary = `Found ${apps.length} applications with user access counts.`
  return r
}

// --- Input suggestion helpers ---

function getHostSuggestions(): { id: string; label: string; type: string }[] {
  return getNodes()
    .filter((n) => n.nodeType === 'HOST' || n.nodeType === 'COMPUTER')
    .map((n) => ({ id: n.id, label: `${n.displayName} (${n.id})`, type: n.nodeType }))
}

function getApplicationSuggestions(): { id: string; label: string; type: string }[] {
  return getNodes()
    .filter((n) => n.nodeType === 'APPLICATION')
    .map((n) => ({ id: n.id, label: `${n.displayName} (${n.id})`, type: n.nodeType }))
}

function getGroupSuggestions(): { id: string; label: string; type: string }[] {
  return getNodes()
    .filter((n) => n.nodeType === 'GROUP' || n.nodeType === 'LINUX_GROUP')
    .map((n) => ({ id: n.id, label: `${n.displayName} (${n.id})`, type: n.nodeType }))
}

function getUserSuggestions(): { id: string; label: string; type: string }[] {
  return getNodes()
    .filter((n) => n.nodeType === 'USER' || n.nodeType === 'LINUX_USER')
    .map((n) => ({ id: n.id, label: `${n.displayName} (${n.id})`, type: n.nodeType }))
}

// --- Public API ---

const resultCache = new Map<string, QuestionResult>()

export function clearCache(): void {
  resultCache.clear()
}

export function setBusinessQuestionGraphData(data: GraphData): void {
  graphData = data
  clearCache()
}

export function executeQuestion(questionId: string, input?: string): QuestionResult {
  const cacheKey = `${questionId}:${input || ''}`
  if (resultCache.has(cacheKey)) return resultCache.get(cacheKey)!

  let result: QuestionResult
  switch (questionId) {
    case 'who-access-host':
      result = queryWhoAccessHost(input || '')
      break
    case 'who-access-app':
      result = queryWhoAccessApp(input || '')
      break
    case 'domain-admins':
      result = queryDomainAdmins()
      break
    case 'inherit-domain-admin':
      result = queryInheritDomainAdmin()
      break
    case 'production-access':
      result = queryProductionAccess()
      break
    case 'finance-app-access':
      result = queryFinanceAppAccess()
      break
    case 'sudo-users':
      result = querySudoUsers()
      break
    case 'sudo-groups':
      result = querySudoGroups()
      break
    case 'privileged-service-accounts':
      result = queryPrivilegedServiceAccounts()
      break
    case 'ssh-users':
      result = querySshUsers()
      break
    case 'orphan-groups':
      result = queryOrphanGroups()
      break
    case 'disabled-users-access':
      result = queryDisabledUsersAccess()
      break
    case 'cross-system-accounts':
      result = queryCrossSystemAccounts()
      break
    case 'highest-risk-identities':
      result = queryHighestRiskIdentities()
      break
    case 'bsvc-depend-on-host':
      result = queryBsvcDependOnHost(input || '')
      break
    case 'host-compromise-impact':
      result = queryHostCompromiseImpact(input || '')
      break
    case 'group-removal-impact':
      result = queryGroupRemovalImpact(input || '')
      break
    case 'app-removal-user-impact':
      result = queryAppRemovalUserImpact(input || '')
      break
    case 'nested-group-membership':
      result = queryNestedGroupMembership()
      break
    case 'direct-privilege-roles':
      result = queryDirectPrivilegeRoles()
      break
    case 'ad-users-linux-access':
      result = queryAdUsersLinuxAccess()
      break
    case 'hosts-no-apps':
      result = queryHostsNoApps()
      break
    case 'users-in-multiple-groups':
      result = queryUsersInMultipleGroups()
      break
    case 'critical-applications':
      result = queryCriticalApplications()
      break
    case 'sudo-wildcard-rules':
      result = querySudoWildcardRules()
      break
    case 'privileged-group-members':
      result = queryPrivilegedGroupMembers()
      break
    case 'orphan-service-accounts':
      result = queryOrphanServiceAccounts()
      break
    case 'app-user-count':
      result = queryAppUserCount()
      break
    default:
      result = makeResult(questionId, 'Unknown question', 'The requested question identifier is not in the published catalog.')
  }

  resultCache.set(cacheKey, result)
  return result
}

export function getSuggestions(inputType: string): { id: string; label: string; type: string }[] {
  switch (inputType) {
    case 'host': return getHostSuggestions()
    case 'application': return getApplicationSuggestions()
    case 'group': return getGroupSuggestions()
    case 'user': return getUserSuggestions()
    default: return []
  }
}
