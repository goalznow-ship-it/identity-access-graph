export interface OfficeLocation {
  id: string
  city: string
  country: string
  timezone: string
  address?: string
  isHeadquarters: boolean
}

export interface BusinessUnit {
  id: string
  name: string
  code: string
  headOfficeId: string
  description: string
}

export interface Department {
  id: string
  name: string
  code: string
  businessUnitId: string
  headOfficeId: string
  description: string
}

export interface Team {
  id: string
  name: string
  code: string
  departmentId: string
  officeId: string
  description: string
}

export interface Domain {
  id: string
  dnsName: string
  netBiosName: string
  type: 'Windows' | 'Linux' | 'Cloud'
  businessUnitId: string
  isPrimary: boolean
  forestId?: string
}

export interface Forest {
  id: string
  name: string
  rootDomain: string
  domainIds: string[]
}

export interface BusinessService {
  id: string
  name: string
  code: string
  owningDepartmentId: string
  criticality: 'Low' | 'Medium' | 'High' | 'Critical'
  sla?: string
  description: string
}

export interface Application {
  id: string
  name: string
  code: string
  owningTeamId: string
  businessServiceId: string
  platform: 'Web' | 'Desktop' | 'Mobile' | 'API' | 'Legacy'
  technology: string
  description: string
}

export interface Database {
  id: string
  name: string
  engine: 'Oracle' | 'PostgreSQL' | 'SQLServer' | 'MySQL' | 'MariaDB' | 'MongoDB'
  owningTeamId: string
  applicationIds: string[]
  environment: string
  description: string
}

export interface NetworkZone {
  id: string
  name: string
  cidr: string
  purpose: string
  environment: string
}

export interface ServerCategory {
  id: string
  name: string
  code: string
  description: string
}

export interface Environment {
  id: string
  name: 'Production' | 'Testing' | 'Development' | 'DMZ'
  code: string
  description: string
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
}
