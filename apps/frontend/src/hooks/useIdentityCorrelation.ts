import { useState } from 'react'
import { correlateImport, getCorrelation } from '../services/importApi'
import type { CorrelationResult } from '../types/import'

export function useIdentityCorrelation() {
  const [result, setResult] = useState<CorrelationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const correlate = async (importId: string, compositeKeyFields?: string[]) => {
    setLoading(true); setError(null)
    try { const value = await correlateImport(importId, compositeKeyFields); setResult(value); return value }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Correlation failed'; setError(message); throw cause }
    finally { setLoading(false) }
  }
  const restore = async (importId: string) => {
    setLoading(true); setError(null)
    try { const value = await getCorrelation(importId); setResult(value); return value }
    catch (cause) { throw cause }
    finally { setLoading(false) }
  }
  return { result, loading, error, correlate, restore, setResult }
}
