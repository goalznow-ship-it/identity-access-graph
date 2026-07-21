import { useState, useCallback, useEffect, useRef } from 'react'
import type { ImportSession, SessionProgress, ImportLimits, PendingFile, DatasetType } from '../types/import'
import { uploadFiles, classifySheet, getImportLimits, getImportProgress, getSession, cancelImport, retryFile, removeFileFromSession } from '../services/importApi'

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'application/json',
]

export function useFileImport() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [session, setSession] = useState<ImportSession | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limits, setLimits] = useState<ImportLimits | null>(null)
  const [progress, setProgress] = useState<SessionProgress | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getImportLimits().then(setLimits).catch(() => { if (typeof console !== 'undefined') console.warn('Failed to load import limits') })
  }, [])

  useEffect(() => {
    if (session && !session.cancelled) {
      pollRef.current = setInterval(async () => {
        try {
          const p = await getImportProgress(session.importId)
          setProgress(p)
          if (p.status === 'completed' || p.status === 'cancelled' || p.status === 'failed') {
            if (p.status === 'completed') {
              const completed = await getSession(session.importId)
              setSession(completed)
            }
            if (pollRef.current) clearInterval(pollRef.current)
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }, 2000)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
  }, [session?.importId, session?.cancelled])

  const maxFileSize = limits ? limits.maxFileSizeMb * 1024 * 1024 : 250 * 1024 * 1024

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|json|jsonl|ndjson)$/i)) {
      return `"${file.name}" has unsupported format.`
    }
    if (file.size > maxFileSize) {
      const mb = limits ? limits.maxFileSizeMb : 250
      return `"${file.name}" exceeds ${mb}MB size limit.`
    }
    return null
  }, [maxFileSize, limits])

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: PendingFile[] = []
    const errors: string[] = []

    for (const file of Array.from(files)) {
      const err = validateFile(file)
      if (err) {
        errors.push(err)
      } else {
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          status: 'pending',
        })
      }
    }

    setPendingFiles((prev) => [...prev, ...newFiles])
    if (errors.length > 0) setError(errors.join('\n'))
    else setError(null)
  }, [validateFile])

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const clearFiles = useCallback(() => {
    if (session && !session.cancelled) {
      cancelImport(session.importId).catch(() => { if (typeof console !== 'undefined') console.warn('Failed to cancel import') })
    }
    setPendingFiles([])
    setSession(null)
    setError(null)
    setProgress(null)
    if (pollRef.current) clearInterval(pollRef.current)
  }, [session])

  const upload = useCallback(async () => {
    if (pendingFiles.length === 0) return

    setUploading(true)
    setError(null)
    setProgress({ status: 'uploading', filesCompleted: 0, filesFailed: 0, totalRows: 0, rowsProcessed: 0, percent: 0, throughput: 0, elapsedMs: 0, estimatedRemainingMs: 0, warnings: [], truncated: false })

    setPendingFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading' as const })))

    try {
      const result = await uploadFiles(pendingFiles.map((f) => f.file))
      setSession(result)
      setProgress(result.progress ?? null)
      setPendingFiles((prev) =>
        prev.map((f) => {
          const uploaded = result.files.find(
            (uf) => uf.originalName === f.file.name,
          )
          return {
            ...f,
            status: uploaded?.error ? 'error' : ('uploaded' as const),
            sessionId: result.importId,
          }
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setPendingFiles((prev) => prev.map((f) => ({ ...f, status: 'error' as const })))
      setProgress(null)
    } finally {
      setUploading(false)
    }
  }, [pendingFiles])

  const cancel = useCallback(async () => {
    if (!session) return
    setCancelling(true)
    try {
      await cancelImport(session.importId)
      setSession((prev) => prev ? { ...prev, cancelled: true } : prev)
      setProgress((prev) => prev ? { ...prev, status: 'cancelled' } : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setCancelling(false)
    }
  }, [session])

  const retry = useCallback(async (fileId: string) => {
    if (!session) return
    setRetrying(fileId)
    try {
      const updated = await retryFile(session.importId, fileId)
      setSession(updated)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setRetrying(null)
    }
  }, [session])

  const removeSessionFile = useCallback(async (fileId: string) => {
    if (!session) return
    try {
      const updated = await removeFileFromSession(session.importId, fileId)
      setSession(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    }
  }, [session])

  const classify = useCallback(async (fileId: string, sheetIndex: number, type: DatasetType) => {
    if (!session) return
    try {
      const updated = await classifySheet(session.importId, fileId, sheetIndex, type)
      setSession(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Classification failed')
    }
  }, [session])

  return {
    pendingFiles,
    session,
    uploading,
    error,
    limits,
    progress,
    cancelling,
    retrying,
    addFiles,
    removeFile,
    clearFiles,
    upload,
    classify,
    cancel,
    retry,
    removeSessionFile,
    setSession,
    setError,
  }
}
