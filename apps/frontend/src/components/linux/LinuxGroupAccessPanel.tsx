import { Badge } from '../ui/Badge'
import type { LinuxGroupAccess } from '../../types/linux'

interface LinuxGroupAccessPanelProps {
  groups: LinuxGroupAccess[]
}

export function LinuxGroupAccessPanel({ groups }: LinuxGroupAccessPanelProps) {
  if (groups.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-500">No Linux groups found.</p>
  }
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-100">{g.displayName}</p>
              <p className="text-xs text-gray-500">GID {g.gid} • {g.memberCount} member(s)</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {g.sudoAccess && <Badge variant="danger">sudo</Badge>}
              {g.sshAccess && <Badge variant="success">ssh</Badge>}
            </div>
          </div>
          {g.members.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {g.members.map((m) => (
                <span key={m} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">{m}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
