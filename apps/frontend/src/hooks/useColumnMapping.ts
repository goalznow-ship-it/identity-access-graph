import { useState, useCallback } from 'react'
import type { ColumnMapping, ImportSession, ApplyMappingsRequest } from '../types/import'
import { getMappings, applyMappings } from '../services/importApi'

interface UseColumnMappingOptions {
  importId: string
  fileId: string
  sheetIndex: number
  session: ImportSession | null
}

export function useColumnMapping({ importId, fileId, sheetIndex, session }: UseColumnMappingOptions) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const results = await getMappings(importId, fileId, sheetIndex)
      const sheetResult = results[0]
      if (sheetResult) {
        setMappings(sheetResult.mappings)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load mappings')
    } finally {
      setLoading(false)
    }
  }, [importId, fileId, sheetIndex, session])

  const updateMapping = useCallback((sourceColumn: string, targetField: string, ignored: boolean) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn ? { ...m, targetField, ignored, confidence: ignored ? 0 : 100 } : m
      )
    )
  }, [])

  const ignoreMapping = useCallback((sourceColumn: string, ignored: boolean) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn ? { ...m, ignored, confidence: ignored ? 0 : m.confidence } : m
      )
    )
  }, [])

  const apply = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const overrides: ApplyMappingsRequest['overrides'] = mappings.map((m) => ({
        sourceColumn: m.sourceColumn,
        targetField: m.targetField,
        ignored: m.ignored,
      }))
      const result = await applyMappings(importId, { fileId, sheetIndex, overrides })
      setMappings(result.mappings)
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply mappings')
      throw e
    } finally {
      setLoading(false)
    }
  }, [importId, fileId, sheetIndex, mappings, session])

  return {
    mappings,
    loading,
    error,
    fetchMappings,
    updateMapping,
    ignoreMapping,
    apply,
    setMappings,
  }
}
