import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'

interface FileDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void
  disabled?: boolean
}

export function FileDropzone({ onFilesSelected, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      if (e.dataTransfer.files.length > 0) onFilesSelected(e.dataTransfer.files)
    },
    [onFilesSelected, disabled],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleClick = useCallback(() => inputRef.current?.click(), [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files)
        e.target.value = ''
      }
    },
    [onFilesSelected],
  )

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
        dragging
          ? 'border-primary bg-primary-muted/20'
          : 'border-border hover:border-primary/40 hover:bg-white/[0.02]'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Upload className={`mx-auto h-8 w-8 ${dragging ? 'text-primary' : 'text-gray-500'}`} />
      <p className="mt-2 text-sm font-medium text-gray-300">
        {dragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        .xlsx, .xls, .csv &mdash; up to 50MB per file
      </p>
    </div>
  )
}
