import type { SshKeyAccess, LinuxUserAccess } from '../../types/linux'

interface SSHAccessPanelProps {
  sshKeys: SshKeyAccess[]
  users: LinuxUserAccess[]
}

export function SSHAccessPanel({ sshKeys, users }: SSHAccessPanelProps) {
  const sshUsers = users.filter((u) => u.sshAccess)
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-300">SSH-enabled Users ({sshUsers.length})</h4>
        {sshUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No SSH-enabled users.</p>
        ) : (
          <div className="space-y-1.5">
            {sshUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                <div>
                  <span className="text-sm text-gray-100">{u.displayName}</span>
                  <span className="ml-2 text-xs text-gray-500">{u.sourceSystem}</span>
                </div>
                <div className="flex gap-2 text-[10px] text-gray-400">
                  {u.sudoAccess && <span className="text-red-400">sudo</span>}
                  {u.privilegedShell && <span className="text-yellow-400">shell</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-300">SSH Keys ({sshKeys.length})</h4>
        {sshKeys.length === 0 ? (
          <p className="text-sm text-gray-500">No SSH keys found.</p>
        ) : (
          <div className="space-y-1.5">
            {sshKeys.map((k) => (
              <div key={k.id} className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-100">{k.displayName}</span>
                  {k.unused && <span className="rounded bg-warning-muted px-1.5 py-0.5 text-[10px] font-medium text-warning">unused</span>}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {k.algorithm} {k.keySize}bit • {k.fingerprint?.substring(0, 20)}...
                  {k.lastUsed && <span> • Last used: {new Date(k.lastUsed).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
