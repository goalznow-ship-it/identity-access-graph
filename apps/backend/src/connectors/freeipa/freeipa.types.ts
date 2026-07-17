import type { PersistedGraphNode, PersistedGraphRelationship } from '../../graph/repositories'
import type { LdapEntry } from '../ldap'

export type FreeipaObjectType =
  | 'USER' | 'GROUP' | 'HOST' | 'HOST_GROUP' | 'ROLE' | 'PERMISSION'
  | 'PRIVILEGE' | 'SUDO_RULE' | 'SUDO_COMMAND' | 'HBAC_RULE'
  | 'SERVICE' | 'SSH_PUBLIC_KEY' | 'NETGROUP'

export interface NormalizedFreeipaObject {
  recordId: string
  objectType: FreeipaObjectType
  dn: string
  ipaUniqueID?: string
  attributes: Record<string, unknown>
  raw: LdapEntry
}

export interface FreeipaGraphResult {
  nodes: PersistedGraphNode[]
  relationships: PersistedGraphRelationship[]
  warnings: string[]
}
