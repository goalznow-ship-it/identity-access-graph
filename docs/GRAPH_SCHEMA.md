# Identity & Access Graph Schema

## Overview

The Identity & Access Graph models enterprise identity and access management as a
property graph. Every entity is a **node**, and every connection between entities
is a **relationship**. This schema supports Active Directory, FreeIPA, Linux,
and future sources (Oracle, PostgreSQL, VMware, Azure/Entra ID).

---

## Node Types

| Category | Node | Description |
|---|---|---|
| **Identity** | `User` | Human identity with credentials and attributes |
| | `Group` | Security or distribution group (AD / POSIX) |
| | `Role` | RBAC role aggregating permissions |
| | `Permission` | Atomic action on a resource |
| | `Department` | Organizational department |
| | `Team` | Sub-departmental team |
| | `Manager` | Supervisory role in reporting hierarchy |
| **Infrastructure** | `Forest` | AD forest boundary |
| | `Domain` | AD or LDAP domain |
| | `OrganizationalUnit` | AD OU for policy scope |
| | `Computer` | AD-joined machine |
| | `Host` | Physical or virtual server |
| | `OperatingSystem` | OS version and patch state |
| | `Site` | AD site topology |
| | `Subnet` | Network segment |
| **Policy** | `GroupPolicy` | GPO with computer/user settings |
| | `Trust` | Domain trust relationship |
| | `ServiceAccount` | Non-human AD/LDAP account |
| | `ManagedServiceAccount` | gMSA with automatic password rotation |
| **Business** | `Application` | Software application |
| | `Database` | Data store (SQL / NoSQL) |
| | `BusinessService` | Business capability |
| **Linux** | `LinuxUser` | POSIX user account |
| | `LinuxGroup` | POSIX group |
| | `SudoPolicy` | Sudoers privilege rule |
| | `SSHKey` | Public key for authentication |
| **Future** | `AzureTenant`, `CloudAccount`, `VM`, `Container`, `KubernetesCluster`, `NetworkShare` | Placeholder nodes for cloud and virtualization |

---

## Relationship Catalog

### Membership

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **MemberOf** | `User` → `Group` | M:N | `MEMBER_OF` | `memberOf` |
| **Group MemberOf** | `Group` → `Group` | M:N | `MEMBER_OF` | `memberOf` |
| **Linux MemberOf** | `LinuxUser` → `LinuxGroup` | M:N | `MEMBER_OF` | — |

### Organizational Hierarchy

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **BelongsTo (Department)** | `User` → `Department` | N:1 | `BELONGS_TO` | `department` |
| **Contains (Team)** | `Department` → `Team` | 1:N | `CONTAINS` | — |
| **ReportsTo** | `User` → `Manager` | N:1 | `REPORTS_TO` | `manager` |
| **BelongsTo (Team)** | `User` → `Team` | M:N | `BELONGS_TO` | — |
| **OwnedBy (BusinessService → Department)** | `BusinessService` → `Department` | N:1 | `OWNED_BY` | — |
| **OwnedBy (Application → Team)** | `Application` → `Team` | N:1 | `OWNED_BY` | — |

### Access Control

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **HasRole** | `User` → `Role` | M:N | `HAS_ROLE` | `memberOf` (role group) |
| **HasPermission** | `Role` → `Permission` | M:N | `HAS_PERMISSION` | — |
| **AppliesTo** | `Permission` → `Application` | M:N | `APPLIES_TO` | `acl` |
| **HasAccess (Sudo)** | `LinuxUser` → `SudoPolicy` | M:N | `HAS_ACCESS` | — |

### Infrastructure

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **Contains (OU → Computer)** | `OrganizationalUnit` → `Computer` | 1:N | `CONTAINS` | `distinguishedName` |
| **BelongsTo (Computer → Domain)** | `Computer` → `Domain` | N:1 | `BELONGS_TO` | `memberOf` |
| **PartOf (Domain → Forest)** | `Domain` → `Forest` | N:1 | `PART_OF` | `msDS-PrincipalName` |
| **BelongsTo (OU → Domain)** | `OrganizationalUnit` → `Domain` | N:1 | `BELONGS_TO` | `distinguishedName` |
| **RunsOn (Host → OS)** | `Host` → `OperatingSystem` | N:1 | `RUNS_ON` | `operatingSystem` |
| **LocatedIn (Host → Site)** | `Host` → `Site` | N:1 | `LOCATED_IN` | `msDS-SiteName` |
| **LocatedIn (Host → Subnet)** | `Host` → `Subnet` | N:1 | `LOCATED_IN` | — |

### Policy

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **AppliesTo (GPO → Computer)** | `GroupPolicy` → `Computer` | M:N | `APPLIES_TO` | `gPLink` |
| **LinkedTo (OU → GPO)** | `OrganizationalUnit` → `GroupPolicy` | M:N | `LINKED_TO` | `gPLink` |
| **Trusts** | `Domain` → `Domain` | M:N | `TRUSTS` | `trustedDomain` |

### Authentication

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **AuthenticatesTo (User → Computer)** | `User` → `Computer` | M:N | `AUTHENTICATES_TO` | `lastLogon` |
| **AuthenticatesTo (User → Host)** | `User` → `Host` | M:N | `AUTHENTICATES_TO` | — |
| **Owns (SSHKey)** | `LinuxUser` → `SSHKey` | 1:N | `OWNS` | — |

### Service Accounts

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **RunsOn (ServiceAccount → Application)** | `ServiceAccount` → `Application` | M:N | `RUNS_ON` | `servicePrincipalName` |
| **AssignedTo (MSA → Host)** | `ManagedServiceAccount` → `Host` | M:N | `ASSIGNED_TO` | `msDS-HostServiceAccount` |

### Application Topology

| Relationship | Source → Target | Cardinality | Neo4j Type | AD Attribute |
|---|---|---|---|---|
| **ConnectsTo** | `Application` → `Database` | M:N | `CONNECTS_TO` | — |
| **PartOf** | `Application` → `BusinessService` | N:1 | `PART_OF` | — |
| **HostedOn** | `Database` → `Host` | N:1 | `HOSTED_ON` | — |

---

## Neo4j Cypher Reference

### Node Creation Pattern

```cypher
CREATE (u:User {
  id: $id,
  displayName: $displayName,
  sourceSystem: $sourceSystem,
  status: $status,
  riskLevel: $riskLevel,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
```

### Relationship Creation Pattern

```cypher
MATCH (u:User {id: $userId})
MATCH (g:Group {id: $groupId})
CREATE (u)-[:MEMBER_OF {createdAt: $timestamp}]->(g)
```

### Index Recommendations

```cypher
CREATE INDEX user_id IF NOT EXISTS FOR (u:User) ON (u.id)
CREATE INDEX group_id IF NOT EXISTS FOR (g:Group) ON (g.id)
CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)
CREATE INDEX host_name IF NOT EXISTS FOR (h:Host) ON (h.hostname)
CREATE INDEX domain_dns IF NOT EXISTS FOR (d:Domain) ON (d.dnsName)
```

---

## Graph Traversal Examples

**User permissions (RBAC path):**
```
User → HAS_ROLE → Role → HAS_PERMISSION → Permission → APPLIES_TO → Application
```

**Organizational reporting:**
```
Department → CONTAINS → Team → BELONGS_TO → User → REPORTS_TO → Manager
```

**Infrastructure dependency:**
```
Forest → PART_OF → Domain → BELONGS_TO → Computer → CONTAINS → OU
                           → CONTAINS → OU → LINKED_TO → GPO
```

**Attack path (privilege escalation):**
```
User → MEMBER_OF → Group → MEMBER_OF → Group → HAS_ROLE → Role
```

---

## Cardinality Legend

| Notation | Meaning |
|---|---|
| 1:1 | One-to-one |
| 1:N | One-to-many |
| N:1 | Many-to-one |
| M:N | Many-to-many |

---

## Source System Compatibility

| Relationship | AD | FreeIPA | Linux | Entra ID | Oracle | PgSQL | VMware | AWS IAM |
|---|---|---|---|---|---|---|---|---|
| MEMBER_OF | ✓ | ✓ | ✓ | ✓ | | | | ✓ |
| BELONGS_TO | ✓ | ✓ | | ✓ | | | ✓ | |
| REPORTS_TO | ✓ | | | ✓ | | | | |
| HAS_ROLE | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |
| HAS_PERMISSION | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| AUTHENTICATES_TO | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| CONTAINS | ✓ | | | ✓ | | | ✓ | |
| TRUSTS | ✓ | ✓ | | ✓ | | | | |
| HOSTED_ON | | | ✓ | | ✓ | ✓ | ✓ | |
| CONNECTS_TO | | | | | ✓ | ✓ | | |
