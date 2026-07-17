import type { PersistedGraphNode, PersistedGraphRelationship } from '../../graph/repositories'

export type LinuxObjectType =
  | 'USER' | 'GROUP' | 'SUDO_POLICY' | 'SSH_KEY' | 'HOST' | 'OPERATING_SYSTEM'

export interface PasswdEntry {
  username: string
  uid: number
  gid: number
  gecos: string
  home: string
  shell: string
  isSystemAccount: boolean
  loginDisabled: boolean
  sourceFile: string
  sourceLine: number
}

export interface GroupEntry {
  groupName: string
  gid: number
  members: string[]
  sourceFile: string
  sourceLine: number
}

export interface SudoRule {
  rule: string
  hosts: string[]
  users: string[]
  commands: string[]
  sourceFile: string
  sourceLine: number
}

export interface AuthorizedKeyEntry {
  username: string
  keyType: string
  key: string
  fingerprint: string
  comment: string
  sourceFile: string
  sourceLine: number
}

export interface HostIdentity {
  hostname: string
  fqdn: string
  os: string
  kernel: string
  architecture: string
  uptime: string
  ipAddresses: string[]
  machineId: string
  timezone: string
}

export interface NormalizedLinuxObject {
  recordId: string
  objectType: LinuxObjectType
  sourceFile: string
  sourceLine: number
  attributes: Record<string, unknown>
}

export interface LinuxGraphResult {
  nodes: PersistedGraphNode[]
  relationships: PersistedGraphRelationship[]
  warnings: string[]
}
