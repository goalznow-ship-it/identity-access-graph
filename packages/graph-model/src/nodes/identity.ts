import { BaseNode } from '../base/node'

export interface User extends BaseNode {
  email: string
  firstName: string
  lastName: string
  principalName: string
  samAccountName?: string
  managerId?: string
  departmentId?: string
  teams?: string[]
  jobTitle?: string
  phone?: string
  officeLocation?: string
  lastLogin?: string
  passwordAgeDays?: number
  mfaEnabled?: boolean
  locked?: boolean
}

export interface Group extends BaseNode {
  mail?: string
  distinguishedName?: string
  memberIds?: string[]
  memberCount?: number
  isSecurityGroup: boolean
  scope?: 'Universal' | 'Global' | 'DomainLocal' | 'Builtin'
}

export interface Role extends BaseNode {
  permissionIds: string[]
  inheritable: boolean
  priority?: number
  assignmentType?: 'Direct' | 'Nested' | 'Derived'
}

export interface Permission extends BaseNode {
  resource: string
  action: string
  effect: 'Allow' | 'Deny'
  accessType?: string
  conditions?: Record<string, unknown>
  appliesTo?: string[]
}

export interface Department extends BaseNode {
  code?: string
  headId?: string
  parentDepartmentId?: string
  costCenter?: string
  level?: number
}

export interface Team extends BaseNode {
  leadId?: string
  departmentId?: string
  memberIds?: string[]
  purpose?: string
}

export interface Manager extends BaseNode {
  employeeId?: string
  directReportIds?: string[]
  title?: string
  managesCount?: number
}
