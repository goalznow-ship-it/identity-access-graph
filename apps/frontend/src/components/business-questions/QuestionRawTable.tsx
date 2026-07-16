interface QuestionRawTableProps {
  data: Record<string, unknown>[]
}

export function QuestionRawTable({ data }: QuestionRawTableProps) {
  if (data.length === 0) return null
  const keys = Object.keys(data[0])

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-card">
            {keys.map((k) => (
              <th key={k} className="px-3 py-2 font-medium text-gray-400 uppercase tracking-wider">{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
              {keys.map((k) => (
                <td key={k} className="px-3 py-2 text-gray-300">{String(row[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
