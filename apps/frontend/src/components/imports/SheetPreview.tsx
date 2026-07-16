import type { SheetInfo } from '../../types/import'

interface SheetPreviewProps {
  sheet: SheetInfo
}

export function SheetPreview({ sheet }: SheetPreviewProps) {
  if (sheet.rowCount === 0) {
    return <p className="py-4 text-center text-sm text-gray-500">Sheet is empty.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-card">
            <th className="w-10 px-2 py-1.5 text-gray-500">#</th>
            {sheet.headers.map((h) => (
              <th key={h} className="px-2 py-1.5 font-medium text-gray-300">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.previewRows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
              <td className="px-2 py-1 text-gray-500">{i + 1}</td>
              {sheet.headers.map((h) => (
                <td key={h} className="max-w-[200px] truncate px-2 py-1 text-gray-300">
                  {String(row[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sheet.rowCount > 20 && (
        <p className="border-t border-border px-2 py-1 text-[10px] text-gray-500">
          Showing first 20 of {sheet.rowCount} rows
        </p>
      )}
    </div>
  )
}
