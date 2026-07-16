import { BaseNode } from '../base/node'

export interface LinuxUser extends BaseNode {
  uid: number
  gid: number
  homeDirectory: string
  shell: string
  groupIds: string[]
  sshKeyIds?: string[]
  sudoPolicyIds?: string[]
  passwordExpires?: string
  locked: boolean
  lastPasswordChange?: string
}

export interface LinuxGroup extends BaseNode {
  gid: number
  memberIds: string[]
}

export interface SudoPolicy extends BaseNode {
  userIds: string[]
  groupIds?: string[]
  hostIds: string[]
  runAsUsers?: string[]
  runAsGroups?: string[]
  commands: string[]
  nopasswd: boolean
  defaults?: string[]
  sudoersPath?: string
}

export interface SSHKey extends BaseNode {
  fingerprint: string
  algorithm: 'RSA' | 'ECDSA' | 'Ed25519' | 'DSA'
  keySize?: number
  ownerId?: string
  authorizedOnIds?: string[]
  lastUsed?: string
  expiresAt?: string
  publicKey?: string
}
