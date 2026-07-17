export interface RelationshipDefinition {
  name: string
  sourceNode: string
  targetNode: string
  cardinality: string
  description: string
  typicalAdAttribute?: string
  neo4jRelationshipType: string
  category: string
  bidirectional?: boolean
  inverseName?: string
}

function R(
  name: string,
  source: string,
  target: string,
  card: string,
  desc: string,
  neo4jType: string,
  category: string,
): RelationshipDefinition
function R(
  name: string,
  source: string,
  target: string,
  card: string,
  desc: string,
  adAttr: string | undefined,
  neo4jType: string,
  category: string,
  inverse?: string,
): RelationshipDefinition
function R(
  name: string,
  source: string,
  target: string,
  card: string,
  desc: string,
  ...metadata: [neo4jType: string, category: string] | [adAttr: string | undefined, neo4jType: string, category: string, inverse?: string]
): RelationshipDefinition {
  const [adAttr, neo4jType, category, inverse] = metadata.length === 2
    ? [undefined, metadata[0], metadata[1], undefined]
    : metadata
  return {
  name,
  sourceNode: source,
  targetNode: target,
  cardinality: card,
  description: desc,
  typicalAdAttribute: adAttr,
  neo4jRelationshipType: neo4jType,
  category,
  bidirectional: !!inverse,
  inverseName: inverse,
  }
}

export const RELATIONSHIPS: Record<string, RelationshipDefinition> = {
  // ── Membership ──────────────────────────────────────────────
  userMemberOfGroup: R(
    'User → Group (MemberOf)',
    'User', 'Group', 'M:N',
    'User is a member of a security or distribution group. Core AD membership relationship used for access control and group nesting.',
    'memberOf', 'MEMBER_OF', 'Membership',
  ),
  groupMemberOfGroup: R(
    'Group → Group (MemberOf)',
    'Group', 'Group', 'M:N',
    'Group nesting: one group is a member of another. Enables hierarchical permission inheritance across AD domains.',
    'memberOf', 'MEMBER_OF', 'Membership',
  ),
  userMemberOfLinuxGroup: R(
    'LinuxUser → LinuxGroup (MemberOf)',
    'LinuxUser', 'LinuxGroup', 'M:N',
    'Linux user is a member of a POSIX group. Maps to /etc/group entries and FreeIPA HBAC rules.',
    'member', 'MEMBER_OF', 'Membership',
  ),

  // ── Organizational Hierarchy ────────────────────────────────
  userBelongsToDepartment: R(
    'User → Department',
    'User', 'Department', 'N:1',
    'User belongs to a department. Organizational attribute used for reporting, cost center allocation, and access policies.',
    'department', 'BELONGS_TO', 'Organization',
  ),
  departmentBelongsToTeam: R(
    'Department → Team',
    'Department', 'Team', '1:N',
    'Department contains teams. Maps internal team structure beneath departmental hierarchy.',
    undefined, 'CONTAINS', 'Organization',
  ),
  userReportsToManager: R(
    'User → Manager (ReportsTo)',
    'User', 'Manager', 'N:1',
    'User reports to a manager. Defines the reporting line for approvals, escalations, and org chart traversal.',
    'manager', 'REPORTS_TO', 'Organization',
    'Manager → User (Manages)',
  ),
  userBelongsToTeam: R(
    'User → Team',
    'User', 'Team', 'M:N',
    'User is assigned to a team. Cross-functional team membership independent of department structure.',
    undefined, 'BELONGS_TO', 'Organization',
  ),

  // ── Role & Permission ───────────────────────────────────────
  userAssignedRole: R(
    'User → Role',
    'User', 'Role', 'M:N',
    'User is assigned a role. Roles aggregate permissions for simplified access management (RBAC).',
    'memberOf (role group)', 'HAS_ROLE', 'Access',
  ),
  roleIncludesPermission: R(
    'Role → Permission',
    'Role', 'Permission', 'M:N',
    'Role includes one or more permissions. Maps RBAC role-to-permission assignments.',
    undefined, 'HAS_PERMISSION', 'Access',
  ),
  permissionAppliesToApplication: R(
    'Permission → Application',
    'Permission', 'Application', 'M:N',
    'Permission grants access to an application resource. Defines what action is allowed on which application.',
    'acl', 'APPLIES_TO', 'Access',
  ),

  // ── Infrastructure Hierarchy ────────────────────────────────
  ouContainsComputer: R(
    'OrganizationalUnit → Computer',
    'OrganizationalUnit', 'Computer', '1:N',
    'OU contains computer objects. AD organizational unit hierarchy for computer management and GPO scoping.',
    'distinguishedName', 'CONTAINS', 'Infrastructure',
  ),
  computerBelongsToDomain: R(
    'Computer → Domain',
    'Computer', 'Domain', 'N:1',
    'Computer is joined to a domain. Maps machine-to-domain membership for AD-joined systems.',
    'memberOf (domain)', 'BELONGS_TO', 'Infrastructure',
  ),
  domainPartOfForest: R(
    'Domain → Forest',
    'Domain', 'Forest', 'N:1',
    'Domain is part of an AD forest. Defines the trust boundary and schema scope.',
    'msDS-PrincipalName', 'PART_OF', 'Infrastructure',
  ),
  ouBelongsToDomain: R(
    'OrganizationalUnit → Domain',
    'OrganizationalUnit', 'Domain', 'N:1',
    'OU is contained within a domain. Every OU exists under exactly one domain partition.',
    'distinguishedName', 'BELONGS_TO', 'Infrastructure',
  ),

  // ── Computer & Host Relationships ───────────────────────────
  hostRunsOperatingSystem: R(
    'Host → OperatingSystem',
    'Host', 'OperatingSystem', 'N:1',
    'Host runs a specific operating system. Tracks OS version, patch level, and end-of-life status.',
    'operatingSystem', 'RUNS_ON', 'Infrastructure',
  ),
  hostLocatedInSite: R(
    'Host → Site',
    'Host', 'Site', 'N:1',
    'Host is physically or logically located in an AD site. Maps to AD site topology for replication and service location.',
    'msDS-SiteName', 'LOCATED_IN', 'Infrastructure',
  ),
  hostOnSubnet: R(
    'Host → Subnet',
    'Host', 'Subnet', 'N:1',
    'Host is assigned to a subnet. Maps IP allocation to network segments for zoning and firewall policies.',
    undefined, 'LOCATED_IN', 'Infrastructure',
  ),
  computerLinkedToGpo: R(
    'Computer → GroupPolicy (GPO)',
    'Computer', 'GroupPolicy', 'M:N',
    'Group Policy Object applies to a computer. Direct or inherited GPO link for computer configuration policies.',
    'gPLink', 'APPLIES_TO', 'Policy',
  ),
  ouLinkedToGpo: R(
    'OrganizationalUnit → GroupPolicy (GPO)',
    'OrganizationalUnit', 'GroupPolicy', 'M:N',
    'GPO is linked to an OU. Defines policy application scope within the AD hierarchy.',
    'gPLink', 'LINKED_TO', 'Policy',
  ),

  // ── Identity & Authentication ────────────────────────────────
  userLogsOnToComputer: R(
    'User → Computer',
    'User', 'Computer', 'M:N',
    'User has logged on to a computer. Tracks interactive and network logon sessions for forensic analysis.',
    'lastLogon', 'AUTHENTICATES_TO', 'Authentication',
  ),
  userLogsOnToHost: R(
    'User → Host',
    'User', 'Host', 'M:N',
    'User has authenticated to a host. Captures SSH logins, RDP sessions, and sudo usage.',
    undefined, 'AUTHENTICATES_TO', 'Authentication',
  ),
  linuxUserSudoPolicy: R(
    'LinuxUser → SudoPolicy',
    'LinuxUser', 'SudoPolicy', 'M:N',
    'Linux user is granted sudo privileges via a sudoers policy. Maps privilege escalation rules.',
    undefined, 'HAS_ACCESS', 'Access',
  ),
  linuxUserHasSshKey: R(
    'LinuxUser → SSHKey',
    'LinuxUser', 'SSHKey', '1:N',
    'Linux user has an authorized SSH key. Maps public key authentication for passwordless access.',
    undefined, 'OWNS', 'Authentication',
  ),

  // ── Service Accounts ────────────────────────────────────────
  serviceAccountRunsApplication: R(
    'ServiceAccount → Application',
    'ServiceAccount', 'Application', 'M:N',
    'Service account is used by an application. Maps non-human identities to application service principals.',
    'servicePrincipalName', 'RUNS_ON', 'Service',
  ),
  managedServiceAccountOnHost: R(
    'ManagedServiceAccount → Host',
    'ManagedServiceAccount', 'Host', 'M:N',
    'Managed service account is associated with a host. Tracks gMSA delegation to specific servers.',
    'msDS-HostServiceAccount', 'ASSIGNED_TO', 'Service',
  ),

  // ── Trust Relationships ─────────────────────────────────────
  domainTrustsDomain: R(
    'Domain → Domain (Trust)',
    'Domain', 'Domain', 'M:N',
    'Domain trusts another domain. Defines authentication trust paths across AD forests and realms.',
    'trustedDomain', 'TRUSTS', 'Trust',
  ),

  // ── Application & Data Topology ─────────────────────────────
  applicationDependsOnDatabase: R(
    'Application → Database',
    'Application', 'Database', 'M:N',
    'Application connects to a database. Tracks data dependencies and service-to-storage mapping.',
    undefined, 'CONNECTS_TO', 'Topology',
  ),
  applicationPartOfBusinessService: R(
    'Application → BusinessService',
    'Application', 'BusinessService', 'N:1',
    'Application is part of a business service. Maps technical components to business capabilities.',
    undefined, 'PART_OF', 'Topology',
  ),
  databaseHostedOnHost: R(
    'Database → Host',
    'Database', 'Host', 'N:1',
    'Database instance runs on a host. Maps data storage to physical or virtual infrastructure.',
    undefined, 'HOSTED_ON', 'Topology',
  ),
  businessServiceOwnedByDepartment: R(
    'BusinessService → Department',
    'BusinessService', 'Department', 'N:1',
    'Business service is owned by a department. Maps service ownership for cost and compliance.',
    undefined, 'OWNED_BY', 'Organization',
  ),
  applicationOwnedByTeam: R(
    'Application → Team',
    'Application', 'Team', 'N:1',
    'Application is maintained by a team. Maps operational ownership for incident response.',
    undefined, 'OWNED_BY', 'Organization',
  ),
}

export const RELATIONSHIP_LIST: RelationshipDefinition[] = Object.values(RELATIONSHIPS)

export const RELATIONSHIP_BY_CATEGORY = RELATIONSHIP_LIST.reduce<
  Record<string, RelationshipDefinition[]>
>((acc, rel) => {
  ;(acc[rel.category] ??= []).push(rel)
  return acc
}, {})
