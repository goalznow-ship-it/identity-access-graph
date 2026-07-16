export interface CommonProperties {
  enabled: boolean
  deleted: boolean
  critical: boolean
  owner?: string
  businessUnit?: string
  environment?: string
  classification?: string
  complianceTags?: string[]
}
