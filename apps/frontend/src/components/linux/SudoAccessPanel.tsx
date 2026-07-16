import { Badge } from '../ui/Badge'
import type { SudoPolicyAccess, LinuxUserAccess } from '../../types/linux'

interface SudoAccessPanelProps {
  sudoPolicies: SudoPolicyAccess[]
  users: LinuxUserAccess[]
  groups: { id: string; displayName: string }[]
}

export function SudoAccessPanel({ sudoPolicies, users, groups }: SudoAccessPanelProps) {
  const sudoUsers = users.filter((u) => u.sudoAccess)
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-300">Sudo-enabled Users ({sudoUsers.length})</h4>
        {sudoUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No sudo-enabled users.</p>
        ) : (
          <div className="space-y-1.5">
            {sudoUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                <span className="text-sm text-gray-100">{u.displayName}</span>
                <div className="flex gap-2 text-[10px] text-gray-400">
                  {u.privilegedShell && <span className="text-yellow-400">shell</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-300">Sudo Policies ({sudoPolicies.length})</h4>
        {sudoPolicies.length === 0 ? (
          <p className="text-sm text-gray-500">No sudo policies apply to this host.</p>
        ) : (
          <div className="space-y-1.5">
            {sudoPolicies.map((sp) => (
              <div key={sp.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-100">{sp.displayName}</p>
                    <p className="text-xs text-gray-500">{sp.sourceSystem}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {sp.nopasswd && <Badge variant="warning">NOPASSWD</Badge>}
                    {sp.isWildcard && <Badge variant="danger">ALL</Badge>}
                    {sp.isDirectRoot && <Badge variant="danger">root</Badge>}
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <p><span className="text-gray-500">Commands: </span><span className="text-gray-300">{sp.commands.join(', ') || '-'}</span></p>
                  <p><span className="text-gray-500">Run as: </span><span className="text-gray-300">{sp.runAsUsers.join(', ')}</span></p>
                  <p><span className="text-gray-500">Groups: </span>
                    {sp.groupIds.map((gid) => {
                      const g = groups.find((g) => g.id === gid)
                      return <span key={gid} className="text-gray-300">{g?.displayName || gid} </span>
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
