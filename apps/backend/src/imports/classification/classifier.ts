import type { DatasetType, ClassificationResult } from '../types'

interface HeaderPattern {
  patterns: string[]
  type: DatasetType
  weight: number
}

const patterns: HeaderPattern[] = [
  { patterns: ['firstname', 'lastname', 'email', 'samaccountname', 'employeeid', 'displayname', 'userprincipalname', 'username', 'givenname', 'sn', 'mail', 'department'], type: 'Users', weight: 3 },
  { patterns: ['groupname', 'group', 'gid', 'grouptype', 'scope', 'category', 'description'], type: 'Groups', weight: 3 },
  { patterns: ['username', 'groupname', 'member', 'memberof', 'group', 'user', 'distinguishedname'], type: 'Group Memberships', weight: 4 },
  { patterns: ['departmentname', 'department', 'dept', 'manager', 'head', 'budget', 'costcenter'], type: 'Departments', weight: 3 },
  { patterns: ['teamname', 'team', 'lead', 'project', 'squad'], type: 'Teams', weight: 3 },
  { patterns: ['manager', 'reports', 'supervisor', 'directreport', 'managedby'], type: 'Managers', weight: 3 },
  { patterns: ['rolename', 'role', 'permission', 'privilege', 'roledescription'], type: 'Roles', weight: 3 },
  { patterns: ['permissionname', 'permission', 'resource', 'action', 'accessmask', 'effect'], type: 'Permissions', weight: 3 },
  { patterns: ['computername', 'hostname', 'fqdn', 'dnsname', 'os', 'operatingsystem', 'serialnumber'], type: 'Computers', weight: 3 },
  { patterns: ['linuxhost', 'hostname', 'ipaddress', 'ssh', 'port', 'environment', 'subnet'], type: 'Linux Hosts', weight: 3 },
  { patterns: ['linuxuser', 'uid', 'gid', 'shell', 'homedirectory', 'sshkey'], type: 'Linux Users', weight: 3 },
  { patterns: ['linuxgroup', 'groupname', 'gid', 'members'], type: 'Linux Groups', weight: 3 },
  { patterns: ['sudopolicy', 'command', 'runas', 'nopasswd', 'sudoers', 'host'], type: 'Sudo Policies', weight: 4 },
  { patterns: ['sshkey', 'fingerprint', 'algorithm', 'publickey', 'privatekey', 'owner'], type: 'SSH Keys', weight: 4 },
  { patterns: ['applicationname', 'appname', 'url', 'endpoint', 'authentication', 'vendor', 'version'], type: 'Applications', weight: 3 },
  { patterns: ['databasename', 'dbname', 'engine', 'connectionstring', 'host', 'port', 'instance'], type: 'Databases', weight: 3 },
  { patterns: ['servicename', 'businessservice', 'sla', 'criticality', 'rto', 'rpo', 'compliance'], type: 'Business Services', weight: 3 },
  { patterns: ['serviceaccountname', 'principalname', 'spn', 'managedby', 'passwordlastrotated'], type: 'Service Accounts', weight: 4 },
]

export function classify(headers: string[]): ClassificationResult {
  const headerLower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

  let bestType: DatasetType = 'Unknown'
  let bestScore = 0
  let matchedPatterns: string[] = []

  for (const pattern of patterns) {
    let score = 0
    const matched: string[] = []

    for (const p of pattern.patterns) {
      const hasMatch = headerLower.some((h) => h.includes(p) || p.includes(h))
      if (hasMatch) {
        score += pattern.weight
        matched.push(p)
      }
    }

    const coverage = score / (pattern.patterns.length * pattern.weight)
    const normalizedScore = score * (1 + coverage)

    if (normalizedScore > bestScore) {
      bestScore = normalizedScore
      bestType = pattern.type
      matchedPatterns = matched
    }
  }

  if (bestScore === 0) {
    return { type: 'Unknown', confidence: 0, matchedPatterns: [] }
  }

  const maxPossibleScore = Math.max(...patterns.map((p) => p.patterns.length * p.weight * 2))
  const confidence = Math.min(Math.round((bestScore / maxPossibleScore) * 100), 100)

  return { type: bestType, confidence, matchedPatterns }
}
