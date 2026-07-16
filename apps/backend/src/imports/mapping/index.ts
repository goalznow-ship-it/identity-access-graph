export { MappingService } from './mapping.service'
export type { ColumnMapping, MappingSet } from './mapping.service'
export { TARGET_FIELDS, findTargetField, getFieldDef } from './mapping-aliases'
export type { FieldDef } from './mapping-aliases'
export {
  isValidEmail, isValidIp, isValidHostname, isValidUuid, isValidSid,
  isValidEmployeeId, isValidStatus, isValidRiskLevel, isValidSourceSystem,
  normalizeStatus, normalizeRiskLevel, normalizeSourceSystem, detectValuePattern,
} from './value-patterns'
export type { ValidationIssue } from './value-patterns'
