export interface SecurityScenario {
  id: string
  title: string
  description: string
  riskLevel: string
  affectedNodeIds: string[]
  affectedRelationshipIds: string[]
}

export const scenarios: SecurityScenario[] = [
  {
    id: 'scenario-disabled-user-active-memberships',
    title: 'Disabled user with active group memberships',
    description:
      'Robert Kim (user-006) has AccountStatus.Disabled but still retains ' +
      'MEMBER_OF relationships to group-finance-users and group-app-prod-access. ' +
      'This represents an offboarding gap where the user account was disabled ' +
      'but group memberships were not cleaned up, potentially granting access ' +
      'if the account is re-enabled or if a replica is out of date.',
    riskLevel: 'HIGH',
    affectedNodeIds: ['user-006', 'group-finance-users', 'group-app-prod-access'],
    affectedRelationshipIds: ['rel-user-006-group-finance-users', 'rel-user-006-group-app-prod-access'],
  },
  {
    id: 'scenario-nested-privileged-access',
    title: 'Indirect privileged access through nested group membership',
    description:
      'Sarah Chen (user-001) is a direct member of group-domain-admins (a privileged group). ' +
      'group-domain-admins is nested inside group-enterprise-admins, which grants enterprise-wide ' +
      'administrative privileges. This means Sarah has escalated privileges beyond what her direct ' +
      'group membership suggests, making it harder to audit true privilege levels.',
    riskLevel: 'CRITICAL',
    affectedNodeIds: ['user-001', 'group-domain-admins', 'group-enterprise-admins'],
    affectedRelationshipIds: ['rel-user-001-group-domain-admins', 'rel-group-domain-admins-group-enterprise-admins'],
  },
  {
    id: 'scenario-high-risk-service-account',
    title: 'Service account with excessive risk level',
    description:
      'svc_monitor (svcacct-monitoring) has riskLevel.HIGH but is a monitoring account that ' +
      'should have only read-only access. The account has supportsNtlm: true (legacy protocol) ' +
      'and its last password rotation was over 3 months ago. This combination of high risk level, ' +
      'NTLM support, and credential age makes it a potential attack vector.',
    riskLevel: 'HIGH',
    affectedNodeIds: ['svcacct-monitoring'],
    affectedRelationshipIds: ['rel-svcacct-monitoring-app-payment-gateway'],
  },
  {
    id: 'scenario-linux-sudo-through-group',
    title: 'Linux user with sudo access through group membership',
    description:
      'Rachel Green (luser-rachel) is a member of lgroup-devs, which grants the ' +
      'sudo-service-restart SudoPolicy. This means Rachel can restart any service as root ' +
      'on host-dev-01 without a password prompt (nopasswd: false — password required). ' +
      'While not full sudo, this is a privilege escalation path from a database administrator ' +
      'role to root-level service control.',
    riskLevel: 'MEDIUM',
    affectedNodeIds: ['luser-rachel', 'lgroup-devs', 'sudo-service-restart', 'host-dev-01'],
    affectedRelationshipIds: ['rel-luser-rachel-lgroup-devs', 'rel-lgroup-devs-sudo-service-restart'],
  },
  {
    id: 'scenario-orphaned-group',
    title: 'Orphaned group with no members',
    description:
      'group-ipa-users (FreeIPA Users) has zero members (memberCount: 0) but is still an active ' +
      'group object. This orphaned group represents configuration drift — it may have been ' +
      'created for a project that never launched, or all members were removed without ' +
      'cleaning up the group. Orphaned groups can be reclaimed by attackers for privilege escalation.',
    riskLevel: 'LOW',
    affectedNodeIds: ['group-ipa-users'],
    affectedRelationshipIds: [],
  },
  {
    id: 'scenario-sensitive-cross-domain-access',
    title: 'User with access to production host and sensitive finance application',
    description:
      'David Miller (user-007) has AUTHENTICATES_TO on host-web-prod (a production web server) ' +
      'via direct relationship and also holds role-developer, which grants perm-app-payments-write ' +
      '(write access to the Payment Gateway — a PCI-DSS-scoped finance application). ' +
      'This combination of production infrastructure access and sensitive financial application ' +
      'write access represents a blast radius concern: a compromise of David\'s account ' +
      'could impact both infrastructure and financial data.',
    riskLevel: 'HIGH',
    affectedNodeIds: ['user-007', 'host-web-prod', 'role-developer', 'perm-app-payments-write', 'app-payment-gateway'],
    affectedRelationshipIds: [
      'rel-user-007-host-web-prod',
      'rel-user-007-role-developer',
      'rel-role-developer-perm-app-payments-write',
      'rel-perm-payments-write-app-payment-gateway',
    ],
  },
]
