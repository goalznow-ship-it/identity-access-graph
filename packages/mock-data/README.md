# Mock Dataset — Identity & Access Graph Platform

## Fictional Company

**NexusCore Industries** — a multinational enterprise with:
- 7 office locations (New York HQ, San Francisco, London, Frankfurt, Sydney, Singapore, Tokyo)
- 5 business units: Corporate Operations, Technology Solutions, Financial Services, Healthcare Systems, Defense & Security
- Active Directory forest with 5 Windows domains + Linux (FreeIPA) + Cloud (Entra ID)

## Included Systems

| System | Source | Nodes |
|---|---|---|
| Active Directory | `SourceSystem.ActiveDirectory` | Users, Groups, Computers, GPOs, OUs, Domain, Forest |
| FreeIPA | `SourceSystem.FreeIPA` | Linux users, groups, cross-system user mappings |
| Linux | `SourceSystem.Linux` | Sudo policies, SSH keys, POSIX groups |
| Oracle (future) | `SourceSystem.Oracle` | Payments database |
| PostgreSQL | `SourceSystem.PostgreSQL` | Portal & CRM databases |

## Dataset Counts

| Entity | Count |
|---|---|
| Forests | 1 |
| Domains | 1 |
| Organizational Units | 4 |
| Departments | 4 |
| Teams | 6 |
| Managers | 3 |
| Users | 12 |
| Groups | 10 |
| Roles | 6 |
| Permissions | 10 |
| Computers | 4 |
| Hosts | 5 |
| Operating Systems | 3 |
| Sites | 1 |
| Subnets | 2 |
| Linux Users | 3 |
| Linux Groups | 3 |
| Sudo Policies | 2 |
| SSH Keys | 2 |
| Applications | 4 |
| Databases | 3 |
| Business Services | 3 |
| Service Accounts | 2 |
| Managed Service Accounts | 1 |
| GPOs | 2 |
| **Total Nodes** | **96** |
| **Total Relationships** | **155** |

## Intentional Risk Scenarios

1. **Disabled user with active memberships** — Robert Kim (user-006) is disabled but still MEMBER_OF finance-users and production app access groups.

2. **Indirect privileged access** — Sarah Chen (user-001) is in Domain Admins which nests into Enterprise Admins, granting privileges beyond direct membership.

3. **High-risk service account** — svc_monitor has risk level HIGH, NTLM enabled, and stale password rotation.

4. **Linux sudo through group** — Rachel Green (luser-rachel) gets sudo service-restart capability through the linux-developers group membership.

5. **Orphaned group** — group-ipa-users has zero members but still exists as an active group object.

6. **Cross-domain blast radius** — David Miller (user-007) has both production host access and write access to the PCI-scoped Payment Gateway application.

## Cross-System Identity Mapping

Users existing in **both** Active Directory and FreeIPA:
- David Miller (user-007) → luser-david
- Lisa Anderson (user-008) → (FreeIPA member via group-ipa-users)

## Validation

Run `validateDataset()` to verify:
- No duplicate node IDs
- No duplicate relationship IDs
- All relationship source nodes exist
- All relationship target nodes exist
