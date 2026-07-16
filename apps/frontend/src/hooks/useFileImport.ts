import { useState, useCallback } from 'react'
import type { ImportSession, PendingFile, DatasetType } from '../types/import'
import { uploadFiles, classifySheet } from '../services/importApi'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
]

export function useFileImport() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [session, setSession] = useState<ImportSession | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return `"${file.name}" has unsupported format.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" exceeds 50MB size limit.`
    }
    return null
  }, [])

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
    setPendingFiles([])
    setSession(null)
    setError(null)
  }, [])

  const upload = useCallback(async () => {
    if (pendingFiles.length === 0) return

    setUploading(true)
    setError(null)

    setPendingFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading' as const })))

    try {
      const result = await uploadFiles(pendingFiles.map((f) => f.file))
      setSession(result)
      setPendingFiles((prev) =>
        prev.map((f) => {
          const uploaded = result.files.find(
            (uf) => uf.originalName === f.file.name,
          )
          return {
            ...f,
            status: uploaded?.error ? 'error' : 'uploaded' as const,
            sessionId: result.importId,
          }
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setPendingFiles((prev) => prev.map((f) => ({ ...f, status: 'error' as const })))
    } finally {
      setUploading(false)
    }
  }, [pendingFiles])

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
    addFiles,
    removeFile,
    clearFiles,
    upload,
    classify,
    setError,
  }
}
