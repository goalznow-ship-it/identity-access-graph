export type DatasetType =
  | 'Users' | 'Groups' | 'Group Memberships' | 'Departments' | 'Teams' | 'Managers'
  | 'Roles' | 'Permissions'
  | 'Computers' | 'Linux Hosts' | 'Linux Users' | 'Linux Groups'
  | 'Sudo Policies' | 'SSH Keys'
  | 'Applications' | 'Databases' | 'Business Services' | 'Service Accounts'
  | 'Unknown'

export type ImportStatus = 'uploading' | 'uploaded' | 'inspected' | 'classified' | 'error'

export interface ImportFile {
  id: string
  originalName: string
  sanitizedName: string
  mimeType: string
  size: number
  status: ImportStatus
  sheets: SheetInfo[]
  error?: string
  filePath?: string
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

export interface ClassificationResult {
  type: DatasetType
  confidence: number
  matchedPatterns: string[]
}

export interface UploadResponse {
  importId: string
  files: ImportFile[]
}

export interface InspectResponse {
  importId: string
  files: ImportFile[]
}

export interface ClassifyRequest {
  fileId: string
  sheetIndex: number
  type: DatasetType
}

export interface ImportSession {
  importId: string
  files: ImportFile[]
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
