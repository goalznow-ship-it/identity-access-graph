import type { QuestionPath } from '../../types/businessQuestions'

interface QuestionPathListProps {
  paths: QuestionPath[]
}

const NODE_COLORS: Record<string, string> = {
  USER: 'text-blue-400 bg-blue-500/10',
  LINUX_USER: 'text-teal-400 bg-teal-500/10',
  GROUP: 'text-green-400 bg-green-500/10',
  LINUX_GROUP: 'text-teal-400 bg-teal-500/10',
  ROLE: 'text-orange-400 bg-orange-500/10',
  PERMISSION: 'text-yellow-400 bg-yellow-500/10',
  APPLICATION: 'text-cyan-400 bg-cyan-500/10',
  DATABASE: 'text-pink-400 bg-pink-500/10',
  HOST: 'text-purple-400 bg-purple-500/10',
  COMPUTER: 'text-purple-400 bg-purple-500/10',
  BUSINESS_SERVICE: 'text-red-400 bg-red-500/10',
  SUDO_POLICY: 'text-red-400 bg-red-500/10',
  SSH_KEY: 'text-yellow-400 bg-yellow-500/10',
}

export function QuestionPathList({ paths }: QuestionPathListProps) {
  const displayPaths = paths.slice(0, 50)

  return (
    <div className="space-y-1.5">
      {displayPaths.map((path, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs">
          {path.nodes.map((node, j) => (
            <span key={j} className="flex items-center gap-1">
              {j > 0 && <span className="text-gray-600">→</span>}
              <span className={`rounded px-1.5 py-0.5 font-medium ${NODE_COLORS[node.nodeType] || 'text-gray-300 bg-white/5'}`}>
                {node.displayName || node.id}
              </span>
            </span>
          ))}
          {path.nodes.length === 0 && path.relationships.length > 0 && (
            <span className="text-gray-500">{path.relationships.join(' → ')}</span>
          )}
        </div>
      ))}
      {paths.length > 50 && (
        <p className="text-xs text-gray-500">...and {paths.length - 50} more paths</p>
      )}
    </div>
  )
}
