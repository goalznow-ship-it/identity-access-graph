export { ValidationService } from './validation.service'
export type { ValidationResult } from './validation.service'
export { detectDuplicateValues } from './duplicate-detector'
export { validateReferences } from './reference-validator'
export {
  validateRequiredFields, validateDuplicateMappings,
  validateEmailField, validateIpField, validateHostnameField,
  validateUuidField, validateSidField, validateEmployeeIdField,
  validateStatusField, validateRiskLevelField, validateSourceSystemField,
} from './validation-rules'
export { generateNormalizedPreview } from './normalized-preview'
export type { NormalizedRecord } from './normalized-preview'
