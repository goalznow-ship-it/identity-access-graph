const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const SID_RE = /^S-\d+-\d+(-\d+)+$/
const EMPLOYEE_ID_RE = /^[A-Za-z0-9-]+$/

const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'DISABLED', 'LOCKED', 'DELETED', 'PENDING']
const VALID_RISK_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const VALID_SOURCE_SYSTEMS = ['ACTIVE_DIRECTORY', 'FREE_IPA', 'LINUX', 'ENTRA_ID', 'ORACLE', 'POSTGRESQL', 'VMWARE', 'AWS_IAM', 'AZURE_AD', 'LDAP', 'OKTA', 'KEYCLOAK', 'GCP', 'CUSTOM', 'MANUAL']

export interface ValidationIssue {
  code: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  message: string
  file: string
  sheet: string
  row: number
  sourceColumn: string
  targetField: string
  rawValue: string
  suggestedResolution: string
}

export function isValidEmail(v: string): boolean { return EMAIL_RE.test(v) }

export function isValidIp(v: string): boolean {
  if (!IPV4_RE.test(v)) return false
  const parts = v.split('.').map(Number)
  return parts.every((p) => p >= 0 && p <= 255)
}

export function isValidHostname(v: string): boolean { return HOSTNAME_RE.test(v) }

export function isValidUuid(v: string): boolean { return UUID_RE.test(v) }

export function isValidSid(v: string): boolean { return SID_RE.test(v) }

export function isValidEmployeeId(v: string): boolean { return EMPLOYEE_ID_RE.test(v) }

export function isValidStatus(v: string): boolean { return VALID_STATUSES.includes(v.toUpperCase()) }

export function isValidRiskLevel(v: string): boolean { return VALID_RISK_LEVELS.includes(v.toUpperCase()) }

export function isValidSourceSystem(v: string): boolean { return VALID_SOURCE_SYSTEMS.includes(v.toUpperCase().replace(/-/g, '_')) }

export function normalizeStatus(v: string): string { return v.toUpperCase() }

export function normalizeRiskLevel(v: string): string { return v.toUpperCase() }

export function normalizeSourceSystem(v: string): string { return v.toUpperCase().replace(/-/g, '_') }

export function normalizeEmail(v: string): string { return v.toLowerCase().trim() }

export function detectValuePattern(values: string[], targetField: string): number {
  const nonEmpty = values.filter((v) => v && String(v).trim())
  if (nonEmpty.length === 0) return 0

  let matches = 0
  for (const v of nonEmpty) {
    const s = String(v).trim()
    switch (targetField) {
      case 'email':
        if (isValidEmail(s)) matches++
        break
      case 'ipAddress':
        if (isValidIp(s)) matches++
        break
      case 'hostname':
      case 'fqdn':
        if (isValidHostname(s)) matches++
        break
      case 'objectGUID':
        if (isValidUuid(s)) matches++
        break
      case 'sid':
        if (isValidSid(s)) matches++
        break
      case 'employeeId':
        if (isValidEmployeeId(s)) matches++
        break
      case 'status':
        if (isValidStatus(s)) matches++
        break
      case 'riskLevel':
        if (isValidRiskLevel(s)) matches++
        break
      case 'sourceSystem':
        if (isValidSourceSystem(s)) matches++
        break
      case 'uid':
      case 'gid':
        if (/^\d+$/.test(s)) matches++
        break
      case 'ipAddresses':
        if (s.split(',').every((ip) => isValidIp(ip.trim()))) matches++
        break
      default:
        if (s.length > 0) matches++
    }
  }

  return Math.round((matches / nonEmpty.length) * 100)
}
