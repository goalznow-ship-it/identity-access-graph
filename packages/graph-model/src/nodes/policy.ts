import { BaseNode } from '../base/node'

export interface GroupPolicy extends BaseNode {
  domainId?: string
  organizationalUnitIds?: string[]
  computerSettings?: Record<string, unknown>
  userSettings?: Record<string, unknown>
  revisionNumber?: number
  enforced: boolean
  enabled: boolean
  gpoId?: string
}

export interface Trust extends BaseNode {
  sourceDomainId: string
  targetDomainId: string
  trustType: 'External' | 'Forest' | 'Realm' | 'ParentChild'
  direction: 'Inbound' | 'Outbound' | 'Bidirectional'
  transitive: boolean
  sidFilteringEnabled: boolean
  trustPassword?: string
  trustEstablished?: string
}

export interface ServiceAccount extends BaseNode {
  principalName: string
  domainId?: string
  managedBy?: string
  allowedHostIds?: string[]
  delegatedServices?: string[]
  passwordLastRotated?: string
  supportsKerberos: boolean
  supportsNtlm?: boolean
}

export interface ManagedServiceAccount extends BaseNode {
  hostId?: string
  domainId?: string
  groupManaged: boolean
  dnsHostName?: string
  samAccountName?: string
  sid?: string
  managedPasswordIntervalDays?: number
}
