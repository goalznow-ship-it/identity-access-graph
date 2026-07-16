import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { SheetPreview } from './SheetPreview'
import { DatasetTypeSelector } from './DatasetTypeSelector'
import type { ImportFile, DatasetType } from '../../types/import'

interface WorkbookInspectorProps {
  file: ImportFile
  onClassify: (fileId: string, sheetIndex: number, type: DatasetType) => void
  onSelect?: (file: ImportFile, sheetIndex: number) => void
}

export function WorkbookInspector({ file, onClassify, onSelect }: WorkbookInspectorProps) {
  const [expanded, setExpanded] = useState(true)
  const [expandedSheet, setExpandedSheet] = useState<number | null>(0)

  const totalRows = file.sheets.reduce((s, sh) => s + sh.rowCount, 0)
  const totalWarnings = file.sheets.reduce((s, sh) => s + sh.warnings.length, 0)

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
        <FileText className="h-4 w-4 text-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-100">{file.originalName}</p>
          <p className="text-xs text-gray-500">
            {file.sheets.length} sheet(s) &middot; {totalRows} rows
          </p>
        </div>
        <div className="flex items-center gap-2">
          {file.status === 'error' && <Badge variant="danger">Error</Badge>}
          {totalWarnings > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              {totalWarnings}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {file.error && (
              <div className="mx-4 mb-3 rounded-lg border border-red-700 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                {file.error}
              </div>
            )}

            {file.sheets.map((sheet, si) => (
              <div key={si} className="border-t border-border">
                <button
                  onClick={() => {
                    setExpandedSheet(expandedSheet === si ? null : si)
                    onSelect?.(file, si)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/[0.02]"
                >
                  {expandedSheet === si ? <ChevronDown className="h-3 w-3 text-gray-500" /> : <ChevronRight className="h-3 w-3 text-gray-500" />}
                  <span className="text-xs font-medium text-gray-300">{sheet.name}</span>
                  <span className="text-[10px] text-gray-500">{sheet.rowCount}r &times; {sheet.columnCount}c</span>
                  <div className="ml-auto flex items-center gap-2">
                    <DatasetTypeSelector
                      value={sheet.classification}
                      confidence={sheet.classificationConfidence}
                      onChange={(type) => onClassify(file.id, si, type)}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedSheet === si && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-4 pb-3"
                    >
                      {sheet.warnings.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {sheet.warnings.map((w, wi) => (
                            <div key={wi} className="flex items-center gap-2 rounded bg-yellow-900/10 px-2 py-1 text-xs text-yellow-300">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {w.message}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mb-2 flex gap-3 text-[10px] text-gray-500">
                        <span>Headers: {sheet.headers.join(', ')}</span>
                      </div>

                      <SheetPreview sheet={sheet} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
