import type {
  ImportSession,
  DatasetType,
  ColumnMapping,
  ValidationResult,
  NormalizedRecord,
  ApplyMappingsRequest,
  ValidateRequest,
  CorrelationResult,
  ConversionResult,
  ImportGraphPreview,
} from '../types/import'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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

export async function correlateImport(importId: string, compositeKeyFields?: string[]): Promise<CorrelationResult> {
  const res = await fetch(`${API_BASE}/imports/${importId}/correlate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compositeKeyFields }),
  })
  if (!res.ok) throw new Error('Identity correlation failed')
  return res.json()
}

export async function getCorrelation(importId: string): Promise<CorrelationResult> {
  const res = await fetch(`${API_BASE}/imports/${importId}/correlation`)
  if (!res.ok) throw new Error('Correlation result not found')
  return res.json()
}

export async function convertImport(importId: string, nodeLimit = 500, relationshipLimit = 2000): Promise<ConversionResult> {
  const res = await fetch(`${API_BASE}/imports/${importId}/convert`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeLimit, relationshipLimit }),
  })
  if (!res.ok) throw new Error('Graph conversion failed')
  return res.json()
}

export async function getImportGraphPreview(importId: string, nodeLimit = 500, relationshipLimit = 2000): Promise<ImportGraphPreview> {
  const params = new URLSearchParams({ nodeLimit: String(nodeLimit), relationshipLimit: String(relationshipLimit) })
  const res = await fetch(`${API_BASE}/imports/${importId}/graph-preview?${params}`)
  if (!res.ok) throw new Error('Imported graph preview not found')
  return res.json()
}

export async function getConversionSummary(importId: string): Promise<Omit<ConversionResult, 'preview'>> {
  const res = await fetch(`${API_BASE}/imports/${importId}/conversion-summary`)
  if (!res.ok) throw new Error('Conversion summary not found')
  return res.json()
}

export async function getSession(importId: string): Promise<ImportSession> {
  const res = await fetch(`${API_BASE}/imports/${importId}`)
  if (!res.ok) throw new Error('Session not found')
  return res.json()
}

export async function classifySheet(
  importId: string,
  fileId: string,
  sheetIndex: number,
  type: DatasetType,
): Promise<ImportSession> {
  const res = await fetch(`${API_BASE}/imports/${importId}/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, sheetIndex, type }),
  })
  if (!res.ok) throw new Error('Classification failed')
  return res.json()
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

  const sheetPath = fileId && sheetIndex !== undefined
    ? `/imports/${importId}/files/${fileId}/sheets/${sheetIndex}/mappings`
    : `/imports/${importId}/mappings?${params.toString()}`
  const res = await fetch(`${API_BASE}${sheetPath}`)
  if (!res.ok) throw new Error('Failed to get mappings')
  const result = await res.json()
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
  const res = await fetch(`${API_BASE}/imports/${importId}/files/${body.fileId}/sheets/${body.sheetIndex}/mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides: body.overrides }),
  })
  if (!res.ok) throw new Error('Failed to apply mappings')
  return res.json()
}

export async function validateSheet(
  importId: string,
  body: ValidateRequest,
): Promise<ValidationResult> {
  const res = await fetch(`${API_BASE}/imports/${importId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Validation failed')
  return res.json()
}

export async function getValidationResults(importId: string): Promise<ValidationResult[]> {
  const res = await fetch(`${API_BASE}/imports/${importId}/validation`)
  if (!res.ok) throw new Error('Failed to get validation results')
  return res.json()
}

export async function getNormalizedPreview(importId: string): Promise<{
  fileId: string
  originalName: string
  sheetIndex: number
  sheetName: string
  records: NormalizedRecord[]
}[]> {
  const res = await fetch(`${API_BASE}/imports/${importId}/normalized-preview`)
  if (!res.ok) throw new Error('Failed to get normalized preview')
  return res.json()
}
