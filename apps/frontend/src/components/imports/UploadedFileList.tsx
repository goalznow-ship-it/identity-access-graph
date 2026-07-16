import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, Loader2 } from 'lucide-react'
import type { PendingFile } from '../../types/import'

interface UploadedFileListProps {
  files: PendingFile[]
  onRemove: (id: string) => void
}

const statusConfig = {
  pending: { icon: FileText, color: 'text-gray-400' },
  uploading: { icon: Loader2, color: 'text-blue-400' },
  uploaded: { icon: FileText, color: 'text-green-400' },
  error: { icon: FileText, color: 'text-red-400' },
}

export function UploadedFileList({ files, onRemove }: UploadedFileListProps) {
  if (files.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500">{files.length} file(s)</p>
      <AnimatePresence>
        {files.map((f) => {
          const cfg = statusConfig[f.status]
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
    </div>
  )
}
