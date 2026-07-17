import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import type { PendingFile, ImportFile } from '../../types/import'

interface UploadedFileListProps {
  files: PendingFile[]
  onRemove: (id: string) => void
  sessionFiles?: ImportFile[]
  onRetry?: (fileId: string) => void
  onRemoveSessionFile?: (fileId: string) => void
  retrying?: string | null
}

const pendingStatusConfig = {
  pending: { icon: FileText, color: 'text-gray-400' },
  uploading: { icon: Loader2, color: 'text-blue-400' },
  uploaded: { icon: FileText, color: 'text-green-400' },
  error: { icon: AlertTriangle, color: 'text-red-400' },
}

export function UploadedFileList({ files, onRemove, sessionFiles, onRetry, onRemoveSessionFile, retrying }: UploadedFileListProps) {
  if (files.length === 0 && (!sessionFiles || sessionFiles.length === 0)) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500">
        {files.length > 0 ? `${files.length} file(s)` : ''}
        {sessionFiles ? `${files.length > 0 ? ' \u00b7 ' : ''}${sessionFiles.length} file(s)` : ''}
      </p>

      <AnimatePresence>
        {files.map((f) => {
          const cfg = pendingStatusConfig[f.status]
          const Icon = cfg.icon
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 80 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
            >
              <Icon className={`h-4 w-4 shrink-0 ${cfg.color} ${f.status === 'uploading' ? 'animate-spin' : ''}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-gray-200">{f.file.name}</p>
                <p className="text-xs text-gray-500">{(f.file.size / 1024).toFixed(1)} KB</p>
              </div>
              {f.status === 'error' && (
                <span className="shrink-0 text-xs text-red-400">Error</span>
              )}
              {f.status === 'uploaded' && (
                <span className="shrink-0 text-xs text-green-400">Uploaded</span>
              )}
              {f.status === 'uploading' && (
                <span className="shrink-0 text-xs text-blue-400">Uploading...</span>
              )}
              <button
                onClick={() => onRemove(f.id)}
                className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/5 hover:text-gray-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {sessionFiles && sessionFiles.length > 0 && (
        <AnimatePresence>
          {sessionFiles.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 80 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-gray-200">{f.originalName}</p>
                <p className="text-xs text-gray-500">
                  {(f.size / 1024).toFixed(1)} KB &middot; {f.status}
                  {f.sheets && f.sheets.length > 0 && ` \u00b7 ${f.sheets.reduce((s, sh) => s + sh.rowCount, 0)} rows`}
                </p>
              </div>
              {f.status === 'error' && f.error && (
                <span className="shrink-0 text-xs text-red-400" title={f.error}>Error</span>
              )}
              {f.status === 'error' && onRetry && (
                <button
                  onClick={() => onRetry(f.id)}
                  disabled={retrying === f.id}
                  className="shrink-0 rounded p-1 text-yellow-500 hover:bg-white/5"
                  title="Retry"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${retrying === f.id ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onRemoveSessionFile && (
                <button
                  onClick={() => onRemoveSessionFile(f.id)}
                  className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/5 hover:text-gray-200"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {f.progress && f.progress.phase !== 'completed' && (
                <div className="w-20">
                  <div className="h-1.5 rounded-full bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${f.progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
