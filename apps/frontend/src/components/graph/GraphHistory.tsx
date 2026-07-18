export function GraphHistory({ entries, index }: { entries: { label: string }[]; index: number }) {
  if (!entries.length) return <p className="text-xs text-gray-600">No focus history yet.</p>
  return (
    <div className="max-h-32 space-y-0.5 overflow-auto">
      {entries.map((entry, i) => (
        <div key={`${entry.label}-${i}`} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${i === index ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-white/[0.02]'}`}>
          <span className="flex h-4 w-4 items-center justify-center rounded bg-white/[0.04] text-[9px] font-medium">{i + 1}</span>
          <span className="truncate">{entry.label}</span>
        </div>
      ))}
    </div>
  )
}
