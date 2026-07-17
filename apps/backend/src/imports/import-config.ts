const env = (key: string, fallback: string): string => {
  const v = process.env[key]
  return v !== undefined && v !== '' ? v : fallback
}

const envInt = (key: string, fallback: number): number => {
  const v = parseInt(env(key, String(fallback)), 10)
  return Number.isFinite(v) && v >= 0 ? v : fallback
}

export const IMPORT_CONFIG = {
  maxFileSizeBytes: envInt('IMPORT_MAX_FILE_SIZE_MB', 250) * 1024 * 1024,
  maxFilesPerSession: envInt('IMPORT_MAX_FILES_PER_SESSION', 50),
  maxRowsPerFile: envInt('IMPORT_MAX_ROWS_PER_FILE', 1_000_000),
  maxRowsPerSheet: envInt('IMPORT_MAX_ROWS_PER_SHEET', 500_000),
  maxSheetsPerWorkbook: envInt('IMPORT_MAX_SHEETS_PER_WORKBOOK', 100),
  previewRows: envInt('IMPORT_PREVIEW_ROWS', 100),
  previewColumns: envInt('IMPORT_PREVIEW_COLUMNS', 100),
  maxCellLength: envInt('IMPORT_MAX_CELL_LENGTH', 20_000),
  sessionTtlMs: envInt('IMPORT_SESSION_TTL_MINUTES', 240) * 60 * 1000,
  maxConcurrentSessions: envInt('IMPORT_MAX_CONCURRENT_SESSIONS', 10),
  maxConcurrentFiles: envInt('IMPORT_MAX_CONCURRENT_FILES', 3),
  chunkSizeRows: envInt('IMPORT_CHUNK_SIZE_ROWS', 5_000),
  maxWarningCount: envInt('IMPORT_MAX_WARNING_COUNT', 1_000),
  maxValidationIssues: envInt('IMPORT_MAX_VALIDATION_ISSUES', 10_000),
  maxUnresolvedReferences: envInt('IMPORT_MAX_UNRESOLVED_REFERENCES', 1_000),
  maxCorrelationConflicts: envInt('IMPORT_MAX_CORRELATION_CONFLICTS', 500),
  maxGraphPreviewNodes: envInt('IMPORT_MAX_GRAPH_PREVIEW_NODES', 10_000),
  maxGraphPreviewRelationships: envInt('IMPORT_MAX_GRAPH_PREVIEW_RELS', 50_000),
  allowedExtensions: ['.xlsx', '.xls', '.csv', '.json', '.jsonl', '.ndjson'] as const,
  uploadDir: process.env.IMPORT_UPLOAD_DIR || pathResolve('.imports-tmp'),
}

function pathResolve(p: string): string {
  const { resolve } = require('node:path')
  return resolve(process.cwd(), p)
}

export type ImportConfig = typeof IMPORT_CONFIG
