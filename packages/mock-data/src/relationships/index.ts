import { RelationshipType, SourceSystem } from '@identity-access-graph/graph-model'
import type { Relationship } from '@identity-access-graph/graph-model'

const TS = '2024-01-01T00:00:00Z'

function R(
  id: string, type: RelationshipType, source: string, target: string,
  system: SourceSystem = SourceSystem.ActiveDirectory,
  props: Record<string, unknown> = {},
): Relationship {
  return {
    id, relationshipType: type, sourceNodeId: source, targetNodeId: target,
    sourceSystem: system, properties: props, createdAt: TS, updatedAt: TS, enabled: true,
  }
}

export const relationships: Relationship[] = [
  // ── User MEMBER_OF Group ──────────────────────────────────────
  R('rel-user-001-group-domain-admins', RelationshipType.MemberOf, 'user-001', 'group-domain-admins'),
  R('rel-user-001-group-enterprise-admins', RelationshipType.MemberOf, 'user-001', 'group-enterprise-admins'),
  R('rel-user-002-group-it-staff', RelationshipType.MemberOf, 'user-002', 'group-it-staff'),
  R('rel-user-002-group-infosec-team', RelationshipType.MemberOf, 'user-002', 'group-infosec-team'),
  R('rel-user-003-group-infosec-team', RelationshipType.MemberOf, 'user-003', 'group-infosec-team'),
  R('rel-user-004-group-it-staff', RelationshipType.MemberOf, 'user-004', 'group-it-staff'),
  R('rel-user-004-group-vpn-access', RelationshipType.MemberOf, 'user-004', 'group-vpn-access'),
  R('rel-user-005-group-it-staff', RelationshipType.MemberOf, 'user-005', 'group-it-staff'),
  R('rel-user-005-group-app-prod-access', RelationshipType.MemberOf, 'user-005', 'group-app-prod-access'),
  R('rel-user-006-group-finance-users', RelationshipType.MemberOf, 'user-006', 'group-finance-users'),
  R('rel-user-006-group-app-prod-access', RelationshipType.MemberOf, 'user-006', 'group-app-prod-access'),
  R('rel-user-007-group-it-staff', RelationshipType.MemberOf, 'user-007', 'group-it-staff'),
  R('rel-user-007-group-ipa-admins', RelationshipType.MemberOf, 'user-007', 'group-ipa-admins'),
  R('rel-user-008-group-infosec-team', RelationshipType.MemberOf, 'user-008', 'group-infosec-team'),
  R('rel-user-008-group-ipa-users', RelationshipType.MemberOf, 'user-008', 'group-ipa-users'),
  R('rel-user-008-group-vpn-access', RelationshipType.MemberOf, 'user-008', 'group-vpn-access'),
  R('rel-user-009-group-it-staff', RelationshipType.MemberOf, 'user-009', 'group-it-staff'),
  R('rel-user-009-group-app-prod-access', RelationshipType.MemberOf, 'user-009', 'group-app-prod-access'),
  R('rel-user-010-group-it-staff', RelationshipType.MemberOf, 'user-010', 'group-it-staff'),
  R('rel-user-011-group-hr-users', RelationshipType.MemberOf, 'user-011', 'group-hr-users'),
  R('rel-user-012-group-finance-users', RelationshipType.MemberOf, 'user-012', 'group-finance-users'),
  R('rel-user-012-group-hr-users', RelationshipType.MemberOf, 'user-012', 'group-hr-users'),

  // ── Group MEMBER_OF Group (nested) ────────────────────────────
  R('rel-group-domain-admins-group-enterprise-admins', RelationshipType.MemberOf, 'group-domain-admins', 'group-enterprise-admins'),
  R('rel-group-it-staff-group-app-prod-access', RelationshipType.MemberOf, 'group-it-staff', 'group-app-prod-access'),
  R('rel-group-finance-users-group-app-prod-access', RelationshipType.MemberOf, 'group-finance-users', 'group-app-prod-access'),

  // ── User BELONGS_TO Department ────────────────────────────────
  R('rel-user-001-dept-it', RelationshipType.BelongsTo, 'user-001', 'dept-it'),
  R('rel-user-002-dept-infosec', RelationshipType.BelongsTo, 'user-002', 'dept-infosec'),
  R('rel-user-003-dept-infosec', RelationshipType.BelongsTo, 'user-003', 'dept-infosec'),
  R('rel-user-004-dept-it', RelationshipType.BelongsTo, 'user-004', 'dept-it'),
  R('rel-user-005-dept-it', RelationshipType.BelongsTo, 'user-005', 'dept-it'),
  R('rel-user-006-dept-fin', RelationshipType.BelongsTo, 'user-006', 'dept-fin'),
  R('rel-user-007-dept-it', RelationshipType.BelongsTo, 'user-007', 'dept-it'),
  R('rel-user-008-dept-infosec', RelationshipType.BelongsTo, 'user-008', 'dept-infosec'),
  R('rel-user-009-dept-it', RelationshipType.BelongsTo, 'user-009', 'dept-it'),
  R('rel-user-010-dept-it', RelationshipType.BelongsTo, 'user-010', 'dept-it'),
  R('rel-user-011-dept-hr', RelationshipType.BelongsTo, 'user-011', 'dept-hr'),
  R('rel-user-012-dept-fin', RelationshipType.BelongsTo, 'user-012', 'dept-fin'),

  // ── User MEMBER_OF Team ───────────────────────────────────────
  R('rel-user-001-team-infra', RelationshipType.MemberOf, 'user-001', 'team-infra'),
  R('rel-user-002-team-iam', RelationshipType.MemberOf, 'user-002', 'team-iam'),
  R('rel-user-003-team-soc', RelationshipType.MemberOf, 'user-003', 'team-soc'),
  R('rel-user-004-team-infra', RelationshipType.MemberOf, 'user-004', 'team-infra'),
  R('rel-user-005-team-app-support', RelationshipType.MemberOf, 'user-005', 'team-app-support'),
  R('rel-user-006-team-finops', RelationshipType.MemberOf, 'user-006', 'team-finops'),
  R('rel-user-007-team-infra', RelationshipType.MemberOf, 'user-007', 'team-infra'),
  R('rel-user-008-team-iam', RelationshipType.MemberOf, 'user-008', 'team-iam'),
  R('rel-user-009-team-infra', RelationshipType.MemberOf, 'user-009', 'team-infra'),
  R('rel-user-010-team-app-support', RelationshipType.MemberOf, 'user-010', 'team-app-support'),
  R('rel-user-011-team-hrops', RelationshipType.MemberOf, 'user-011', 'team-hrops'),
  R('rel-user-012-team-finops', RelationshipType.MemberOf, 'user-012', 'team-finops'),

  // ── User REPORTS_TO Manager ───────────────────────────────────
  R('rel-user-002-reports-to-mgr-001', RelationshipType.ReportsTo, 'user-002', 'mgr-001'),
  R('rel-user-003-reports-to-mgr-001', RelationshipType.ReportsTo, 'user-003', 'mgr-001'),
  R('rel-user-008-reports-to-mgr-001', RelationshipType.ReportsTo, 'user-008', 'mgr-001'),
  R('rel-user-004-reports-to-mgr-009', RelationshipType.ReportsTo, 'user-004', 'mgr-009'),
  R('rel-user-005-reports-to-mgr-009', RelationshipType.ReportsTo, 'user-005', 'mgr-009'),
  R('rel-user-007-reports-to-mgr-009', RelationshipType.ReportsTo, 'user-007', 'mgr-009'),
  R('rel-user-010-reports-to-mgr-009', RelationshipType.ReportsTo, 'user-010', 'mgr-009'),
  R('rel-user-006-reports-to-mgr-012', RelationshipType.ReportsTo, 'user-006', 'mgr-012'),
  R('rel-user-011-reports-to-mgr-012', RelationshipType.ReportsTo, 'user-011', 'mgr-012'),
  R('rel-user-009-reports-to-mgr-001', RelationshipType.ReportsTo, 'user-009', 'mgr-001'),
  R('rel-user-012-reports-to-mgr-001', RelationshipType.ReportsTo, 'user-012', 'mgr-001'),

  // ── User HAS_ROLE Role ────────────────────────────────────────
  R('rel-user-001-role-admin', RelationshipType.HasPermission, 'user-001', 'role-admin'),
  R('rel-user-002-role-auditor', RelationshipType.HasPermission, 'user-002', 'role-auditor'),
  R('rel-user-003-role-support', RelationshipType.HasPermission, 'user-003', 'role-support'),
  R('rel-user-004-role-support', RelationshipType.HasPermission, 'user-004', 'role-support'),
  R('rel-user-005-role-support', RelationshipType.HasPermission, 'user-005', 'role-support'),
  R('rel-user-006-role-finance-analyst', RelationshipType.HasPermission, 'user-006', 'role-finance-analyst'),
  R('rel-user-007-role-developer', RelationshipType.HasPermission, 'user-007', 'role-developer'),
  R('rel-user-008-role-auditor', RelationshipType.HasPermission, 'user-008', 'role-auditor'),
  R('rel-user-009-role-developer', RelationshipType.HasPermission, 'user-009', 'role-developer'),
  R('rel-user-010-role-support', RelationshipType.HasPermission, 'user-010', 'role-support'),
  R('rel-user-011-role-hr-coordinator', RelationshipType.HasPermission, 'user-011', 'role-hr-coordinator'),
  R('rel-user-012-role-finance-analyst', RelationshipType.HasPermission, 'user-012', 'role-finance-analyst'),

  // ── Role GRANTS Permission ────────────────────────────────────
  R('rel-role-admin-perm-app-portal-admin', RelationshipType.HasPermission, 'role-admin', 'perm-app-portal-admin'),
  R('rel-role-admin-perm-app-idp-admin', RelationshipType.HasPermission, 'role-admin', 'perm-app-idp-admin'),
  R('rel-role-admin-perm-serv-prod-access', RelationshipType.HasPermission, 'role-admin', 'perm-serv-prod-access'),
  R('rel-role-auditor-perm-app-portal-read', RelationshipType.HasPermission, 'role-auditor', 'perm-app-portal-read'),
  R('rel-role-auditor-perm-app-payments-read', RelationshipType.HasPermission, 'role-auditor', 'perm-app-payments-read'),
  R('rel-role-developer-perm-app-portal-write', RelationshipType.HasPermission, 'role-developer', 'perm-app-portal-write'),
  R('rel-role-developer-perm-app-payments-write', RelationshipType.HasPermission, 'role-developer', 'perm-app-payments-write'),
  R('rel-role-developer-perm-app-crm-read', RelationshipType.HasPermission, 'role-developer', 'perm-app-crm-read'),
  R('rel-role-support-perm-app-portal-read', RelationshipType.HasPermission, 'role-support', 'perm-app-portal-read'),
  R('rel-role-finance-perm-app-payments-read', RelationshipType.HasPermission, 'role-finance-analyst', 'perm-app-payments-read'),
  R('rel-role-finance-perm-app-crm-read', RelationshipType.HasPermission, 'role-finance-analyst', 'perm-app-crm-read'),
  R('rel-role-hr-perm-app-portal-read', RelationshipType.HasPermission, 'role-hr-coordinator', 'perm-app-portal-read'),

  // ── Permission GRANTS_ACCESS_TO Application ───────────────────
  R('rel-perm-portal-read-app-employee-portal', RelationshipType.AppliesTo, 'perm-app-portal-read', 'app-employee-portal'),
  R('rel-perm-portal-write-app-employee-portal', RelationshipType.AppliesTo, 'perm-app-portal-write', 'app-employee-portal'),
  R('rel-perm-portal-admin-app-employee-portal', RelationshipType.AppliesTo, 'perm-app-portal-admin', 'app-employee-portal'),
  R('rel-perm-payments-read-app-payment-gateway', RelationshipType.AppliesTo, 'perm-app-payments-read', 'app-payment-gateway'),
  R('rel-perm-payments-write-app-payment-gateway', RelationshipType.AppliesTo, 'perm-app-payments-write', 'app-payment-gateway'),
  R('rel-perm-crm-read-app-crm', RelationshipType.AppliesTo, 'perm-app-crm-read', 'app-crm'),
  R('rel-perm-crm-write-app-crm', RelationshipType.AppliesTo, 'perm-app-crm-write', 'app-crm'),
  R('rel-perm-idp-read-app-idp', RelationshipType.AppliesTo, 'perm-app-idp-read', 'app-idp'),
  R('rel-perm-idp-admin-app-idp', RelationshipType.AppliesTo, 'perm-app-idp-admin', 'app-idp'),

  // ── User HAS_ACCESS_TO Host (AUTHENTICATES_TO) ───────────────
  R('rel-user-007-host-web-prod', RelationshipType.AuthenticatesTo, 'user-007', 'host-web-prod'),
  R('rel-user-007-host-dev-01', RelationshipType.AuthenticatesTo, 'user-007', 'host-dev-01'),
  R('rel-user-009-host-app-prod', RelationshipType.AuthenticatesTo, 'user-009', 'host-app-prod'),
  R('rel-user-009-host-dev-01', RelationshipType.AuthenticatesTo, 'user-009', 'host-dev-01'),

  // ── LinuxUser MEMBER_OF LinuxGroup ────────────────────────────
  R('rel-luser-david-lgroup-admins', RelationshipType.MemberOf, 'luser-david', 'lgroup-admins', SourceSystem.FreeIPA),
  R('rel-luser-kevin-lgroup-devs', RelationshipType.MemberOf, 'luser-kevin', 'lgroup-devs', SourceSystem.FreeIPA),
  R('rel-luser-rachel-lgroup-devs', RelationshipType.MemberOf, 'luser-rachel', 'lgroup-devs', SourceSystem.FreeIPA),

  // ── LinuxGroup GRANTS SudoPolicy ──────────────────────────────
  R('rel-lgroup-admins-sudo-full-admin', RelationshipType.HasAccess, 'lgroup-admins', 'sudo-full-admin', SourceSystem.Linux),
  R('rel-lgroup-devs-sudo-service-restart', RelationshipType.HasAccess, 'lgroup-devs', 'sudo-service-restart', SourceSystem.Linux),

  // ── LinuxUser USES SSHKey ─────────────────────────────────────
  R('rel-luser-david-sshkey-david', RelationshipType.Owns, 'luser-david', 'sshkey-david-ed25519', SourceSystem.Linux),
  R('rel-luser-kevin-sshkey-kevin', RelationshipType.Owns, 'luser-kevin', 'sshkey-kevin-rsa', SourceSystem.Linux),

  // ── Host RUNS OperatingSystem ─────────────────────────────────
  R('rel-host-web-prod-os-win2019', RelationshipType.RunsOn, 'host-web-prod', 'os-win2019'),
  R('rel-host-app-prod-os-rhel-9', RelationshipType.RunsOn, 'host-app-prod', 'os-rhel-9'),
  R('rel-host-db-prod-os-win2019', RelationshipType.RunsOn, 'host-db-prod', 'os-win2019'),
  R('rel-host-dev-01-os-ubuntu', RelationshipType.RunsOn, 'host-dev-01', 'os-ubuntu-2204'),
  R('rel-host-mon-01-os-ubuntu', RelationshipType.RunsOn, 'host-mon-01', 'os-ubuntu-2204'),

  // ── Host LOCATED_IN Site ──────────────────────────────────────
  R('rel-host-web-prod-site-nyc', RelationshipType.LocatedIn, 'host-web-prod', 'site-nyc'),
  R('rel-host-app-prod-site-nyc', RelationshipType.LocatedIn, 'host-app-prod', 'site-nyc'),
  R('rel-host-db-prod-site-nyc', RelationshipType.LocatedIn, 'host-db-prod', 'site-nyc'),
  R('rel-host-dev-01-site-nyc', RelationshipType.LocatedIn, 'host-dev-01', 'site-nyc'),
  R('rel-host-mon-01-site-nyc', RelationshipType.LocatedIn, 'host-mon-01', 'site-nyc'),

  // ── Host LOCATED_IN Subnet ────────────────────────────────────
  R('rel-host-web-prod-subnet-prod', RelationshipType.LocatedIn, 'host-web-prod', 'subnet-prod'),
  R('rel-host-app-prod-subnet-prod', RelationshipType.LocatedIn, 'host-app-prod', 'subnet-prod'),
  R('rel-host-db-prod-subnet-prod', RelationshipType.LocatedIn, 'host-db-prod', 'subnet-prod'),
  R('rel-host-dev-01-subnet-dev', RelationshipType.LocatedIn, 'host-dev-01', 'subnet-dev'),
  R('rel-host-mon-01-subnet-dev', RelationshipType.LocatedIn, 'host-mon-01', 'subnet-dev'),

  // ── Computer BELONGS_TO OrganizationalUnit ────────────────────
  R('rel-computer-dc-01-ou-servers', RelationshipType.BelongsTo, 'computer-dc-01', 'ou-servers'),
  R('rel-computer-web-01-ou-computers', RelationshipType.BelongsTo, 'computer-web-01', 'ou-computers'),
  R('rel-computer-sql-01-ou-servers', RelationshipType.BelongsTo, 'computer-sql-01', 'ou-servers'),
  R('rel-computer-file-01-ou-computers', RelationshipType.BelongsTo, 'computer-file-01', 'ou-computers'),

  // ── OrganizationalUnit BELONGS_TO Domain ──────────────────────
  R('rel-ou-users-dom-nexus', RelationshipType.BelongsTo, 'ou-users', 'dom-nexus'),
  R('rel-ou-computers-dom-nexus', RelationshipType.BelongsTo, 'ou-computers', 'dom-nexus'),
  R('rel-ou-servers-dom-nexus', RelationshipType.BelongsTo, 'ou-servers', 'dom-nexus'),
  R('rel-ou-service-accounts-dom-nexus', RelationshipType.BelongsTo, 'ou-service-accounts', 'dom-nexus'),

  // ── Domain BELONGS_TO Forest ──────────────────────────────────
  R('rel-dom-nexus-forest-nexus', RelationshipType.PartOf, 'dom-nexus', 'forest-nexus'),

  // ── Computer BELONGS_TO Domain ────────────────────────────────
  R('rel-computer-dc-01-dom-nexus', RelationshipType.BelongsTo, 'computer-dc-01', 'dom-nexus'),
  R('rel-computer-web-01-dom-nexus', RelationshipType.BelongsTo, 'computer-web-01', 'dom-nexus'),
  R('rel-computer-sql-01-dom-nexus', RelationshipType.BelongsTo, 'computer-sql-01', 'dom-nexus'),
  R('rel-computer-file-01-dom-nexus', RelationshipType.BelongsTo, 'computer-file-01', 'dom-nexus'),

  // ── OrganizationalUnit HAS_GPO GPO ────────────────────────────
  R('rel-ou-computers-gpo-security-baseline', RelationshipType.AppliesTo, 'ou-computers', 'gpo-security-baseline'),
  R('rel-ou-servers-gpo-security-baseline', RelationshipType.AppliesTo, 'ou-servers', 'gpo-security-baseline'),
  R('rel-ou-servers-gpo-windows-update', RelationshipType.AppliesTo, 'ou-servers', 'gpo-windows-update'),

  // ── Computer HAS_GPO (direct link) ────────────────────────────
  R('rel-computer-dc-01-gpo-security-baseline', RelationshipType.AppliesTo, 'computer-dc-01', 'gpo-security-baseline'),
  R('rel-computer-web-01-gpo-security-baseline', RelationshipType.AppliesTo, 'computer-web-01', 'gpo-security-baseline'),
  R('rel-computer-sql-01-gpo-windows-update', RelationshipType.AppliesTo, 'computer-sql-01', 'gpo-windows-update'),

  // ── Application USES Database ─────────────────────────────────
  R('rel-app-employee-portal-db-portal', RelationshipType.ConnectsTo, 'app-employee-portal', 'db-portal'),
  R('rel-app-payment-gateway-db-payments', RelationshipType.ConnectsTo, 'app-payment-gateway', 'db-payments'),
  R('rel-app-crm-db-crm', RelationshipType.ConnectsTo, 'app-crm', 'db-crm'),

  // ── Application SUPPORTS BusinessService ──────────────────────
  R('rel-app-employee-portal-bsvc-hris', RelationshipType.PartOf, 'app-employee-portal', 'bsvc-hris'),
  R('rel-app-payment-gateway-bsvc-payments', RelationshipType.PartOf, 'app-payment-gateway', 'bsvc-payments'),
  R('rel-app-crm-bsvc-crm', RelationshipType.PartOf, 'app-crm', 'bsvc-crm'),

  // ── ServiceAccount USED_BY Application ────────────────────────
  R('rel-svcacct-backup-app-employee-portal', RelationshipType.RunsOn, 'svcacct-backup', 'app-employee-portal'),
  R('rel-svcacct-monitoring-app-payment-gateway', RelationshipType.RunsOn, 'svcacct-monitoring', 'app-payment-gateway'),

  // ── ManagedServiceAccount RUNS_ON Host ────────────────────────
  R('rel-msvcacct-sql-host-db-prod', RelationshipType.RunsOn, 'msvcacct-sql', 'host-db-prod'),
]
