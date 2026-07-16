import { BaseNode } from '../base/node'

export interface Application extends BaseNode {
  version?: string
  vendor?: string
  url?: string
  dependsOnIds?: string[]
  databaseIds?: string[]
  serviceId?: string
  environment?: string
  authenticationMethod?: string
  ssoEnabled?: boolean
  mfaRequired?: boolean
}

export interface Database extends BaseNode {
  engine: string
  version?: string
  hostId?: string
  port?: number
  databaseName?: string
  managedBy?: string
  encrypted: boolean
  sslEnabled?: boolean
  backupEnabled?: boolean
}

export interface BusinessService extends BaseNode {
  ownerId?: string
  criticality: 'Low' | 'Medium' | 'High' | 'Critical'
  sla?: string
  applicationIds?: string[]
  departmentId?: string
  complianceFrameworks?: string[]
  rto?: string
  rpo?: string
}
