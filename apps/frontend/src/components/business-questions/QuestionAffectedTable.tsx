import type { AffectedEntity } from '../../types/businessQuestions'

interface QuestionAffectedTableProps {
  items: AffectedEntity[]
}

export function QuestionAffectedTable({ items }: QuestionAffectedTableProps) {
  if (items.length === 0) return <p className="text-sm text-gray-500">None</p>

  return (
    <div className="space-y-1">
      {items.slice(0, 30).map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-xs">
          <div className="min-w-0 flex-1">
            <span className="text-gray-200">{item.name}</span>
            <span className="ml-1.5 text-gray-500">{item.type}</span>
          </div>
          {item.detail && <span className="shrink-0 text-[10px] text-gray-500">{item.detail}</span>}
        </div>
      ))}
      {items.length > 30 && (
        <p className="text-xs text-gray-500">...and {items.length - 30} more</p>
      )}
    </div>
  )
}
