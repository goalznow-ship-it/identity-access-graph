export type DatasetType =
  | 'Users' | 'Groups' | 'Group Memberships' | 'Departments' | 'Teams' | 'Managers'
  | 'Roles' | 'Permissions'
  | 'Computers' | 'Linux Hosts' | 'Linux Users' | 'Linux Groups'
  | 'Sudo Policies' | 'SSH Keys'
  | 'Applications' | 'Databases' | 'Business Services' | 'Service Accounts'
  | 'Unknown'

export type ImportStatus = 'uploading' | 'uploaded' | 'inspected' | 'classified' | 'error' | 'mapped' | 'validated'

export interface ImportFile {
  id: string
  originalName: string
  sanitizedName: string
  mimeType: string
  size: number
  status: ImportStatus
  sheets: SheetInfo[]
  error?: string
}

export interface SheetInfo {
  name: string
  rowCount: number
  columnCount: number
  headers: string[]
  previewRows: Record<string, unknown>[]
  warnings: SheetWarning[]
  classification: DatasetType
  classificationConfidence: number
  manualOverride?: DatasetType
}

export interface SheetWarning {
  type: 'empty_columns' | 'duplicate_rows' | 'empty_sheet'
  message: string
  column?: string
  count?: number
}

export interface ImportSession {
  importId: string
  files: ImportFile[]
}

export interface PendingFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  sessionId?: string
}

export interface ColumnMapping {
  sourceColumn: string
  sampleValues: string[]
  targetField: string
  confidence: number
  required: boolean
  ignored: boolean
  duplicateTarget: boolean
}

export interface TargetField {
  field: string
  category: string
  required: boolean
}

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

export interface ValidationResult {
  importId: string
  fileId: string
  sheetIndex: number
  issues: ValidationIssue[]
  summary: {
    total: number
    info: number
    warning: number
    error: number
    critical: number
  }
}

export interface NormalizedRecord {
  row: number
  original: Record<string, unknown>
  mapped: Record<string, unknown>
  identityKey: string
  warnings: string[]
  errors: string[]
}

export interface MappingOverride {
  sourceColumn: string
  targetField: string
  ignored: boolean
}

export interface ApplyMappingsRequest {
  fileId: string
  sheetIndex: number
  overrides: MappingOverride[]
}

export interface ValidateRequest {
  fileId: string
  sheetIndex: number
}
