import { Upload, FileText } from 'lucide-react'

interface ImportSessionHeaderProps {
  importId: string
  fileCount: number
  onNewImport: () => void
}

export function ImportSessionHeader({ importId, fileCount, onNewImport }: ImportSessionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-sm font-medium text-gray-200">
            Import Session: <code className="text-primary">{importId.substring(0, 8)}...</code>
          </h2>
          <p className="text-xs text-gray-500">
            {fileCount} file{fileCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <button
        onClick={onNewImport}
        className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      >
        <Upload className="h-3.5 w-3.5" />
        New import
      </button>
    </div>
  )
}
