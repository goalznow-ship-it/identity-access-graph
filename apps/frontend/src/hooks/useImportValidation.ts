import { useState, useCallback } from 'react'
import { validateSheet, getValidationResults, getNormalizedPreview } from '../services/importApi'
import type { ValidationResult, ValidationIssue, NormalizedRecord, ValidateRequest } from '../types/import'

export function useImportValidation() {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [normalizedPreview, setNormalizedPreview] = useState<{
    fileId: string
    originalName: string
    sheetIndex: number
    sheetName: string
    records: NormalizedRecord[]
  }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(async (importId: string, body: ValidateRequest) => {
    setLoading(true)
    setError(null)
    try {
      const result = await validateSheet(importId, body)
      setValidationResults((prev) => {
        const existing = prev.findIndex((r) => r.fileId === result.fileId && r.sheetIndex === result.sheetIndex)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = result
          return updated
        }
        return [...prev, result]
      })
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchValidationResults = useCallback(async (importId: string) => {
    setLoading(true)
    setError(null)
    try {
      const results = await getValidationResults(importId)
      setValidationResults(results)
      return results
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch validation results')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchNormalizedPreview = useCallback(async (importId: string) => {
    setLoading(true)
    setError(null)
    try {
      const preview = await getNormalizedPreview(importId)
      setNormalizedPreview(preview)
      return preview
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch normalized preview')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const getIssuesForSheet = useCallback(
    (fileId: string, sheetIndex: number, filter?: 'all' | 'info' | 'warning' | 'error' | 'critical'): ValidationIssue[] => {
      const result = validationResults.find((r) => r.fileId === fileId && r.sheetIndex === sheetIndex)
      if (!result) return []
      if (!filter || filter === 'all') return result.issues
      return result.issues.filter((i) => i.severity === filter.toUpperCase())
    },
    [validationResults]
  )

  const getSummaryForSheet = useCallback(
    (fileId: string, sheetIndex: number) => {
      return validationResults.find((r) => r.fileId === fileId && r.sheetIndex === sheetIndex)?.summary
    },
    [validationResults]
  )

  const getPreviewForSheet = useCallback(
    (fileId: string, sheetIndex: number) => {
      return normalizedPreview.find((p) => p.fileId === fileId && p.sheetIndex === sheetIndex)?.records ?? []
    },
    [normalizedPreview]
  )

  return {
    validationResults,
    normalizedPreview,
    loading,
    error,
    validate,
    fetchValidationResults,
    fetchNormalizedPreview,
    getIssuesForSheet,
    getSummaryForSheet,
    getPreviewForSheet,
  }
}