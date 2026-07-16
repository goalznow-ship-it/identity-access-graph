import { Badge } from '../ui/Badge'
import type { LinuxUserAccess } from '../../types/linux'

interface LinuxIdentityAccessCardProps {
  user: LinuxUserAccess
}

export function LinuxIdentityAccessCard({ user }: LinuxIdentityAccessCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-100">{user.displayName}</p>
          <p className="text-xs text-gray-500">{user.sourceSystem}{user.uid ? ` • UID ${user.uid}` : ''}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {user.sudoAccess && <Badge variant="danger">sudo</Badge>}
          {user.sshAccess && <Badge variant="success">ssh</Badge>}
          {user.privilegedShell && <Badge variant="warning">shell</Badge>}
          {user.locked && <Badge variant="danger">locked</Badge>}
        </div>
      </div>
      <div className="mt-2 space-y-0.5 text-xs">
        {user.shell && <p><span className="text-gray-500">Shell: </span><span className="text-gray-300">{user.shell}</span></p>}
        {user.homeDirectory && <p><span className="text-gray-500">Home: </span><span className="text-gray-300">{user.homeDirectory}</span></p>}
        {user.accessPaths.length > 0 && (
          <div className="mt-1">
            <p className="mb-0.5 text-[10px] font-medium text-gray-500">Access paths:</p>
            {user.accessPaths.map((path, i) => (
              <p key={i} className="truncate text-[10px] text-gray-400">{path}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
