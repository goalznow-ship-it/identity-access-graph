import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import type { NormalizedRecord } from '../../types/import'

interface NormalizedPreviewProps {
  records: NormalizedRecord[]
  className?: string
}

export function NormalizedPreview({ records, className }: NormalizedPreviewProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card ${className || ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr className="border-b border-border">
              <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-400">Row</th>
              <th className="w-40 px-3 py-2 text-left text-xs font-medium text-gray-400">Identity Key</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Mapped Fields</th>
              <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-400">Status</th>
              <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-400">Issues</th>
              <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => (
              <tr key={record.row} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-xs text-gray-500 font-mono">{record.row}</td>
                <td className="px-3 py-2 text-xs text-gray-300 font-mono max-w-xs truncate" title={record.identityKey}>
                  {record.identityKey}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(record.mapped).slice(0, 4).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-[10px] h-5 px-2">
                        {key}: {String(value).substring(0, 20)}
                      </Badge>
                    ))}
                    {Object.keys(record.mapped).length > 4 && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-2">
                        +{Object.keys(record.mapped).length - 4} more
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {record.errors.length > 0 ? (
                    <Badge variant="danger" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  ) : record.warnings.length > 0 ? (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Warning
                    </Badge>
                  ) : (
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Valid
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs text-gray-500">
                    {record.errors.length + record.warnings.length}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => setExpandedRow(expandedRow === record.row ? null : record.row)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    {expandedRow === record.row ? (
                      <ChevronUp className="h-4 w-4 mx-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mx-auto" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {expandedRow && records.find((r) => r.row === expandedRow) && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-gray-900/50"
          >
            <td colSpan={6} className="p-4">
              {(() => {
                const record = records.find((r) => r.row === expandedRow)!
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Original Row
                        </h4>
                        <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-auto max-h-64">
                          {JSON.stringify(record.original, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Mapped Fields</h4>
                        <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-auto max-h-64">
                          {JSON.stringify(record.mapped, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {record.warnings.length > 0 && (
                      <div className="rounded-lg bg-yellow-900/20 border border-yellow-800 p-3">
                        <h4 className="text-xs font-medium text-yellow-300 mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Warnings ({record.warnings.length})
                        </h4>
                        <ul className="text-xs text-yellow-200 space-y-1">
                          {record.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {record.errors.length > 0 && (
                      <div className="rounded-lg bg-red-900/20 border border-red-800 p-3">
                        <h4 className="text-xs font-medium text-red-300 mb-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Errors ({record.errors.length})
                        </h4>
                        <ul className="text-xs text-red-200 space-y-1">
                          {record.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })()}
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </div>
  )
}