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

export interface SheetWarning {
  type: 'empty_columns' | 'duplicate_rows' | 'empty_sheet' | 'truncated'
  message: string
  column?: string
  count?: number
}

export interface ImportSession {
  importId: string
  files: ImportFile[]
  progress?: SessionProgress
  createdAt: number
  cancelled?: boolean
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

export type CorrelationConfidence = 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CONFLICT'
export interface CorrelationGroup {
  canonicalIdentityId: string
  matchedRecordIds: string[]
  sourceSystems: string[]
  matchMethod: string
  confidence: CorrelationConfidence
  conflicts: string[]
  mergedFields: Record<string, unknown>
  conflictingFields: string[]
  manualReviewRequired: boolean
}
export interface CorrelationResult {
  importId: string
  groups: CorrelationGroup[]
  recordToCanonical: Record<string, string>
  summary: Record<CorrelationConfidence, number> & { records: number; identities: number; recordsMerged: number }
}
export interface UnresolvedReference { recordId: string; field: string; value: string; relationshipType: string; reason: string }
export interface ImportGraphPreview {
  nodes: import('./graph').GraphNode[]
  links: import('./graph').GraphLink[]
  correlationGroups: CorrelationGroup[]
  unresolvedReferences: UnresolvedReference[]
  conflicts: string[]
  warnings: string[]
  pagination: { nodeLimit: number; relationshipLimit: number; totalNodes: number; totalRelationships: number; truncated: boolean }
}
export interface ImportPersistenceSummary {
  nodesUpserted: number
  relationshipsUpserted: number
  skipped: number
  conflicts: number
  durationMs: number
  riskResult?: RiskScanResult | null
  switchedToNeo4j?: boolean
  keptSession?: boolean
}

export interface RiskScanResult {
  rulesRun: number
  findingsDetected: number
  totalFindings: number
  durationMs: number
  graphSource: string
}

export interface ConversionResult {
  nodesCreated: number
  relationshipsCreated: number
  recordsMerged: number
  duplicateNodesSkipped: number
  unresolvedReferences: UnresolvedReference[]
  conflicts: string[]
  manualReviewItems: { canonicalIdentityId?: string; recordIds: string[]; reasons: string[] }[]
  nodeTypeCounts: Record<string, number>
  relationshipTypeCounts: Record<string, number>
  sourceSystemCounts: Record<string, number>
  correlationSummary: CorrelationResult['summary']
  preview: ImportGraphPreview
}
