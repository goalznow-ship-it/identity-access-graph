import type { AccessPathEntry } from '../../types/linux'

interface LinuxAccessPathProps {
  paths: AccessPathEntry[]
}

const NODE_COLORS: Record<string, string> = {
  USER: 'text-blue-400',
  LINUX_USER: 'text-teal-400',
  GROUP: 'text-green-400',
  LINUX_GROUP: 'text-teal-400',
  ROLE: 'text-orange-400',
  PERMISSION: 'text-yellow-400',
  APPLICATION: 'text-cyan-400',
  DATABASE: 'text-pink-400',
  HOST: 'text-purple-400',
  COMPUTER: 'text-purple-400',
  SUDO_POLICY: 'text-red-400',
  SSH_KEY: 'text-yellow-400',
}

export function LinuxAccessPath({ paths }: LinuxAccessPathProps) {
  if (paths.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-500">No access paths found.</p>
  }

  return (
    <div className="space-y-3">
      {paths.map((path, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {path.nodes.map((node, j) => (
              <span key={j} className="flex items-center gap-1">
                {j > 0 && <span className="text-gray-600">→</span>}
                <span className={`rounded px-1.5 py-0.5 font-medium ${
                  NODE_COLORS[node.nodeType] || 'text-gray-300'
                } ${j === 0 ? 'bg-primary-muted/20' : 'bg-white/5'}`}>
                  {node.displayName || node.id}
                </span>
                {j === path.nodes.length - 1 && (
                  <BadgeNode direct={path.direct} />
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BadgeNode({ direct }: { direct: boolean }) {
  return (
    <span className={`ml-1 rounded px-1 py-0.5 text-[10px] font-medium ${
      direct ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
    }`}>
      {direct ? 'direct' : 'inherited'}
    </span>
  )
}
