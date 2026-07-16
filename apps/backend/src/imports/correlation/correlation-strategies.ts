export type MatchMethod = 'objectGUID' | 'SID' | 'employeeId' | 'email' | 'username' | 'distinguishedName' | 'compositeKey' | 'none'
export type CorrelationConfidence = 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CONFLICT'

export interface CorrelationRecord {
  recordId: string
  sourceSystem: string
  fields: Record<string, unknown>
  fileId: string
  fileName: string
  sheetIndex: number
  sheetName: string
  row: number
  datasetType?: string
  validationStatus?: string
  raw?: Record<string, unknown>
}

export interface CorrelationOptions {
  compositeKeyFields?: string[]
}

export const STRATEGIES: { field: string; method: MatchMethod; confidence: CorrelationConfidence; normalize: (value: unknown) => string }[] = [
  { field: 'objectGUID', method: 'objectGUID', confidence: 'EXACT', normalize: normalizeKey },
  { field: 'sid', method: 'SID', confidence: 'EXACT', normalize: normalizeKey },
  { field: 'employeeId', method: 'employeeId', confidence: 'HIGH', normalize: normalizeKey },
  { field: 'email', method: 'email', confidence: 'HIGH', normalize: normalizeEmail },
  { field: 'username', method: 'username', confidence: 'MEDIUM', normalize: normalizeUsername },
  { field: 'samAccountName', method: 'username', confidence: 'MEDIUM', normalize: normalizeUsername },
  { field: 'userPrincipalName', method: 'username', confidence: 'MEDIUM', normalize: normalizeUsername },
  { field: 'distinguishedName', method: 'distinguishedName', confidence: 'MEDIUM', normalize: normalizeDn },
]

export function normalizeKey(value: unknown): string { return String(value ?? '').trim().toLowerCase() }
export function normalizeEmail(value: unknown): string { return normalizeKey(value) }
export function normalizeUsername(value: unknown): string {
  const valueString = normalizeKey(value)
  return valueString.includes('\\') ? valueString.split('\\').pop()! : valueString.split('@')[0]
}
export function normalizeDn(value: unknown): string { return normalizeKey(value).replace(/\s*,\s*/g, ',') }

export function compositeKey(record: CorrelationRecord, fields: string[] = []): string {
  if (fields.length === 0) return ''
  const parts = fields.map((field) => normalizeKey(record.fields[field]))
  return parts.every(Boolean) ? parts.join('|') : ''
}
