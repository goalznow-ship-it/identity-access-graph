import type {
  ImportSession,
  SessionProgress,
  ImportLimits,
  DatasetType,
  ColumnMapping,
  ValidationResult,
  NormalizedRecord,
  ApplyMappingsRequest,
  ValidateRequest,
  CorrelationResult,
  ConversionResult,
  ImportGraphPreview,
  ImportPersistenceSummary,
} from '../types/import'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function getImportLimits(): Promise<ImportLimits> {
  return apiFetch<ImportLimits>('/imports/limits')
}

export async function uploadFiles(files: File[]): Promise<ImportSession> {
  const form = new FormData()
  for (const f of files) form.append('files', f)

  const res = await fetch(`${API_BASE}/imports/upload`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Upload failed')
  }

  return res.json()
}

export async function getSession(importId: string): Promise<ImportSession> {
  return apiFetch<ImportSession>(`/imports/${importId}`)
}

export async function getImportProgress(importId: string): Promise<SessionProgress> {
  return apiFetch<SessionProgress>(`/imports/${importId}/progress`)
}

export async function cancelImport(importId: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/imports/${importId}/cancel`, { method: 'POST' })
}

export async function retryFile(importId: string, fileId: string): Promise<ImportSession> {
  return apiFetch<ImportSession>(`/imports/${importId}/files/${fileId}/retry`, { method: 'POST' })
}

export async function removeFileFromSession(importId: string, fileId: string): Promise<ImportSession> {
  return apiFetch<ImportSession>(`/imports/${importId}/files/${fileId}`, { method: 'DELETE' })
}

export async function correlateImport(importId: string, compositeKeyFields?: string[]): Promise<CorrelationResult> {
  return apiFetch<CorrelationResult>(`/imports/${importId}/correlate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compositeKeyFields }),
  })
}

export async function getCorrelation(importId: string): Promise<CorrelationResult> {
  return apiFetch<CorrelationResult>(`/imports/${importId}/correlation`)
}

export async function convertImport(importId: string, nodeLimit = 500, relationshipLimit = 2000): Promise<ConversionResult> {
  return apiFetch<ConversionResult>(`/imports/${importId}/convert`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeLimit, relationshipLimit }),
  })
}

export async function getImportGraphPreview(importId: string, nodeLimit = 500, relationshipLimit = 2000): Promise<ImportGraphPreview> {
  const params = new URLSearchParams({ nodeLimit: String(nodeLimit), relationshipLimit: String(relationshipLimit) })
  return apiFetch<ImportGraphPreview>(`/imports/${importId}/graph-preview?${params}`)
}

export async function getConversionSummary(importId: string): Promise<Omit<ConversionResult, 'preview'>> {
  return apiFetch<Omit<ConversionResult, 'preview'>>(`/imports/${importId}/conversion-summary`)
}

export async function classifySheet(
  importId: string,
  fileId: string,
  sheetIndex: number,
  type: DatasetType,
): Promise<ImportSession> {
  return apiFetch<ImportSession>(`/imports/${importId}/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, sheetIndex, type }),
  })
}

export async function getMappings(
  importId: string,
  fileId?: string,
  sheetIndex?: number,
): Promise<{
  fileId: string
  originalName: string
  sheetIndex: number
  sheetName: string
  mappings: ColumnMapping[]
  unmappedColumns: string[]
  mappedCount: number
  ignoredCount: number
}[]> {
  const params = new URLSearchParams()
  if (fileId) params.set('fileId', fileId)
  if (sheetIndex !== undefined) params.set('sheetIndex', String(sheetIndex))

  if (fileId && sheetIndex !== undefined) {
    const result = await apiFetch<any>(`/imports/${importId}/files/${fileId}/sheets/${sheetIndex}/mappings`)
    return Array.isArray(result) ? result : [result]
  }
  const result = await apiFetch<any>(`/imports/${importId}/mappings?${params.toString()}`)
  return Array.isArray(result) ? result : [result]
}

export async function applyMappings(
  importId: string,
  body: ApplyMappingsRequest,
): Promise<{
  fileId: string
  sheetIndex: number
  mappings: ColumnMapping[]
  unmappedColumns: string[]
  mappedCount: number
  ignoredCount: number
}> {
  return apiFetch(`/imports/${importId}/files/${body.fileId}/sheets/${body.sheetIndex}/mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides: body.overrides }),
  })
}

export async function validateSheet(
  importId: string,
  body: ValidateRequest,
): Promise<ValidationResult> {
  return apiFetch<ValidationResult>(`/imports/${importId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getValidationResults(importId: string): Promise<ValidationResult[]> {
  return apiFetch<ValidationResult[]>(`/imports/${importId}/validation`)
}

export async function getNormalizedPreview(importId: string): Promise<{
  fileId: string
  originalName: string
  sheetIndex: number
  sheetName: string
  records: NormalizedRecord[]
}[]> {
  return apiFetch(`/imports/${importId}/normalized-preview`)
}

export async function persistImport(importId: string): Promise<ImportPersistenceSummary> {
  return apiFetch<ImportPersistenceSummary>(`/imports/${importId}/persist`, { method: 'POST' })
}

export async function runRiskScan(graphSource: 'auto' | 'neo4j' | 'memory' = 'neo4j'): Promise<{
  rulesRun: number
  findingsDetected: number
  totalFindings: number
  durationMs: number
  graphSource: string
}> {
  return apiFetch('/risk/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graphSource }),
  })
}
