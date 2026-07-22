export type DatasetType =
  | 'Users' | 'Groups' | 'Group Memberships' | 'Departments' | 'Teams' | 'Managers'
  | 'Roles' | 'Permissions'
  | 'Computers' | 'Linux Hosts' | 'Linux Users' | 'Linux Groups'
  | 'Sudo Policies' | 'SSH Keys'
  | 'Applications' | 'Databases' | 'Business Services' | 'Service Accounts'
  | 'Organizational Units' | 'Domains'
  | 'Unknown'

export type ImportStatus = 'uploading' | 'uploaded' | 'inspected' | 'classified' | 'error' | 'mapped' | 'validated'

export type ImportPhase =
  | 'idle' | 'uploading' | 'parsing' | 'classifying' | 'mapping'
  | 'validating' | 'correlating' | 'converting' | 'persisting'
  | 'completed' | 'cancelled' | 'failed'

export interface ImportFile {
  id: string
  originalName: string
  sanitizedName: string
  mimeType: string
  size: number
  status: ImportStatus
  sheets: SheetInfo[]
  error?: string
  errorCode?: string
  filePath?: string
  progress?: FileProgress
}

export interface FileProgress {
  phase: ImportPhase
  percent: number
  rowsProcessed: number
  totalRows: number
  throughput: number
  elapsedMs: number
  estimatedRemainingMs: number
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

/** Internal parser result. `allRows` is retained by ImportsService and is never serialized in API responses. */
export interface ParsedSheetInfo extends SheetInfo {
  allRows: Record<string, unknown>[]
}

export interface SheetWarning {
  type: 'empty_columns' | 'duplicate_rows' | 'empty_sheet' | 'truncated'
  message: string
  column?: string
  count?: number
}

export interface ClassificationResult {
  type: DatasetType
  confidence: number
  matchedPatterns: string[]
}

export interface ImportSession {
  importId: string
  files: ImportFile[]
  progress?: SessionProgress
  createdAt: number
  cancelled?: boolean
  error?: { code: string; message: string }
}

export interface SessionProgress {
  status: ImportPhase
  currentFileId?: string
  filesCompleted: number
  filesFailed: number
  totalRows: number
  rowsProcessed: number
  percent: number
  throughput: number
  elapsedMs: number
  estimatedRemainingMs: number
  warnings: string[]
  truncated: boolean
  truncationReason?: string
}

export interface ClassifyRequest {
  fileId: string
  sheetIndex: number
  type: DatasetType
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

export interface TruncationInfo {
  truncated: boolean
  reason?: string
  totalRows: number
  maxRows: number
}

export interface ImportLimits {
  maxFileSizeMb: number
  maxFilesPerSession: number
  maxRowsPerFile: number
  maxRowsPerSheet: number
  maxSheetsPerWorkbook: number
  previewRows: number
  previewColumns: number
  maxCellLength: number
  sessionTtlMinutes: number
  maxConcurrentSessions: number
  maxConcurrentFiles: number
  chunkSizeRows: number
}
