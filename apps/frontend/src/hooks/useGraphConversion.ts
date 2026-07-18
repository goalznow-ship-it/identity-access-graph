import { useState } from 'react'
import { convertImport, getConversionSummary, getImportGraphPreview } from '../services/importApi'
import type { ConversionResult } from '../types/import'

export function useGraphConversion() {
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const convert = async (importId: string) => {
    setLoading(true); setError(null)
    try { const value = await convertImport(importId); setResult(value); return value }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Conversion failed'; setError(message); throw cause }
    finally { setLoading(false) }
  }
  const restore = async (importId: string) => {
    setLoading(true); setError(null)
    try {
      const [summary, preview] = await Promise.all([getConversionSummary(importId), getImportGraphPreview(importId)])
      const value = { ...summary, preview } as ConversionResult
      setResult(value)
      return value
    } finally { setLoading(false) }
  }
  return { result, loading, error, convert, restore, setResult }
}
