import type { QuestionStat } from '../../types/businessQuestions'

interface QuestionStatCardsProps {
  stats: QuestionStat[]
}

const colorMap: Record<string, string> = {
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  green: 'text-green-400 bg-green-500/10 border-green-500/20',
  teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  pink: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
}

export function QuestionStatCards({ stats }: QuestionStatCardsProps) {
  if (stats.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {stats.map((s, i) => {
        const colors = s.color && colorMap[s.color] ? colorMap[s.color] : 'text-gray-300 bg-white/5 border-border'
        return (
          <div key={i} className={`rounded-lg border px-3 py-2.5 ${colors}`}>
            <p className="text-xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider opacity-80">{s.label}</p>
          </div>
        )
      })}
    </div>
  )
}
