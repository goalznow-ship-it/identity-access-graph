export function GraphHistory({ entries, index }: { entries: { label: string }[]; index: number }) {
  if (!entries.length) return <p className="text-xs text-gray-500">No focus history yet.</p>
  return <div className="max-h-28 space-y-1 overflow-auto">{entries.map((entry, itemIndex) => <div key={`${entry.label}-${itemIndex}`} className={`truncate rounded px-2 py-1 text-xs ${itemIndex === index ? 'bg-primary-muted text-primary' : 'text-gray-500'}`}>{itemIndex + 1}. {entry.label}</div>)}</div>
}
