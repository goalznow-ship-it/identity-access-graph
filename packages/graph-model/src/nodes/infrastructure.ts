import { BaseNode } from '../base/node'
import { OperatingSystemType } from '../enums'

export interface Forest extends BaseNode {
  rootDomain: string
  domainIds: string[]
  siteIds?: string[]
  trustIds?: string[]
  forestMode?: string
  schemaVersion?: string
}

export interface Domain extends BaseNode {
  dnsName: string
  netBiosName?: string
  forestId?: string
  domainFunctionLevel?: string
  sid?: string
  controllerIds?: string[]
  ouIds?: string[]
}

export interface OrganizationalUnit extends BaseNode {
  distinguishedName: string
  path: string
  parentId?: string
  domainId?: string
  protected: boolean
  gpoIds?: string[]
}

export interface Computer extends BaseNode {
  hostname: string
  fqdn?: string
  ipAddress?: string
  macAddress?: string
  domainId?: string
  operatingSystemId?: string
  siteId?: string
  organizationalUnitId?: string
  lastBoot?: string
  osVersion?: string
  serialNumber?: string
  dnsHostName?: string
  serviceAccountIds?: string[]
}

export interface Host extends BaseNode {
  hostname: string
  fqdn?: string
  ipAddresses?: string[]
  operatingSystemId?: string
  computerId?: string
  isVirtual: boolean
  hypervisor?: string
  cpuCores?: number
  memoryGb?: number
  storageGb?: number
}

export interface OperatingSystem extends BaseNode {
  osType: OperatingSystemType
  version: string
  kernelVersion?: string
  buildNumber?: string
  patchLevel?: string
  endOfLife?: string
  licenseType?: string
}

export interface Site extends BaseNode {
  location?: string
  subnetIds?: string[]
  domainId?: string
  description?: string
  siteCode?: string
}

export interface Subnet extends BaseNode {
  cidr: string
  mask: string
  gateway?: string
  siteId?: string
  vlanId?: string
  dnsServers?: string[]
  dhcpServer?: string
}
