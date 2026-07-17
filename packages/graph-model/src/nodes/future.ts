import { BaseNode } from '../base/node'

export interface AzureTenant extends BaseNode {
  tenantId: string
  domainName?: string
  countryCode?: string
  tenantType?: string
  subscriptionIds?: string[]
}

export interface CloudAccount extends BaseNode {
  provider: 'AWS' | 'Azure' | 'GCP' | 'Oracle' | 'Other'
  accountId: string
  accountAlias?: string
  organizationId?: string
  rootEmail?: string
  supportPlan?: string
}

export interface VM extends BaseNode {
  hostname: string
  hypervisor: string
  cpuCores?: number
  memoryMb?: number
  diskGb?: number
  hostId?: string
  ipAddress?: string
  state?: string
  snapshotEnabled?: boolean
}

export interface Container extends BaseNode {
  containerId: string
  image: string
  tag?: string
  ports?: string[]
  environmentVariables?: Record<string, string>
  hostId?: string
  clusterId?: string
}

export interface KubernetesCluster extends BaseNode {
  version: string
  apiEndpoint?: string
  nodeCount?: number
  namespaceIds?: string[]
  provider?: string
  region?: string
  autoScalingEnabled?: boolean
}

export interface NetworkShare extends BaseNode {
  path: string
  protocol: 'SMB' | 'NFS' | 'AFP' | 'Other'
  serverId?: string
  readOnly: boolean
  allowedUserIds?: string[]
  capacityGb?: number
  usedGb?: number
}
