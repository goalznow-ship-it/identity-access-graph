import type { RiskLevel, SourceSystem } from './graph'

export interface LinuxHostSummary {
  id: string
  hostname: string
  fqdn: string
  operatingSystem: string
  environment: string
  ipAddresses: string[]
  site: string
  subnet: string
  owner: string
  team: string
  status: string
  riskLevel: RiskLevel
  sourceSystem: SourceSystem
  isLinux: boolean
  osType: string
  accessibleUserCount: number
  accessibleGroupCount: number
  sudoEnabledIdentityCount: number
  sshEnabledIdentityCount: number
}

export interface LinuxHostDetail {
  host: LinuxHostSummary
  directLinuxUsers: LinuxUserAccess[]
  linuxGroups: LinuxGroupAccess[]
  adUsers: LinuxUserAccess[]
  freeIpaUsers: LinuxUserAccess[]
  serviceAccounts: ServiceAccountAccess[]
  sudoPolicies: SudoPolicyAccess[]
  sshKeys: SshKeyAccess[]
  applications: string[]
  databases: string[]
  businessServices: string[]
}

export interface LinuxUserAccess {
  id: string
  displayName: string
  sourceSystem: SourceSystem
  uid?: number
  shell?: string
  homeDirectory?: string
  locked?: boolean
  lastLogin?: string
  sudoAccess: boolean
  sshAccess: boolean
  privilegedShell: boolean
  accessPaths: string[]
  metadata?: Record<string, unknown>
}

export interface LinuxGroupAccess {
  id: string
  displayName: string
  gid: number
  memberCount: number
  sudoAccess: boolean
  sshAccess: boolean
  members: string[]
}

export interface ServiceAccountAccess {
  id: string
  displayName: string
  principalName: string
  managedBy?: string
  allowedHosts: string[]
  interactiveShell: boolean
}

export interface SudoPolicyAccess {
  id: string
  displayName: string
  commands: string[]
  nopasswd: boolean
  runAsUsers: string[]
  hostIds: string[]
  sourceSystem: SourceSystem
  groupIds: string[]
  isWildcard: boolean
  isDirectRoot: boolean
}

export interface SshKeyAccess {
  id: string
  displayName: string
  algorithm: string
  keySize: number
  fingerprint: string
  ownerId: string
  lastUsed?: string
  unused: boolean
}

export interface EffectiveAccessEntry {
  identityId: string
  identityName: string
  identityType: string
  sourceSystem: SourceSystem
  directSsh: boolean
  inheritedSsh: boolean
  directSudo: boolean
  inheritedSudo: boolean
  privilegedShell: boolean
  accessPaths: AccessPathEntry[]
}

export interface AccessPathEntry {
  nodes: { id: string; displayName: string; nodeType: string; relationshipType: string }[]
  direct: boolean
}

export interface ReverseAccessSummary {
  totalIdentities: number
  directUsers: string[]
  groupMembers: string[]
  sudoUsers: string[]
  sshOnlyUsers: string[]
  indirectUsers: string[]
  dependentBusinessServices: string[]
  impactDescription: string
}

export interface DependencyNode {
  id: string
  displayName: string
  nodeType: string
  direction: 'upstream' | 'downstream' | 'none'
}

export interface LinuxRiskFinding {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  relatedNodes: string[]
}

export interface LinuxHostFilters {
  environment: string[]
  operatingSystem: string[]
  sourceSystem: SourceSystem[]
  riskLevel: RiskLevel[]
  sshAccess: string
  sudoAccess: string
  privilegedAccess: string
  hasApplication: string
  hasDatabase: string
}

export type LinuxAdminTab = 'overview' | 'users-groups' | 'ssh-access' | 'sudo-access' | 'access-paths' | 'dependencies' | 'risk-findings'
