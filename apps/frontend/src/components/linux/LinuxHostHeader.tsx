import { Badge } from '../ui/Badge'
import type { LinuxHostSummary } from '../../types/linux'

const riskBadge: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
  NONE: 'primary', LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger',
}

interface LinuxHostHeaderProps {
  host: LinuxHostSummary
}

export function LinuxHostHeader({ host }: LinuxHostHeaderProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-100">{host.hostname}</h2>
            <Badge variant={riskBadge[host.riskLevel] || 'primary'}>{host.riskLevel}</Badge>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              host.status === 'ACTIVE' ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
            }`}>{host.status}</span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{host.fqdn}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
        <div>
          <span className="text-gray-500">OS: </span>
          <span className="text-gray-300">{host.operatingSystem}</span>
        </div>
        <div>
          <span className="text-gray-500">Environment: </span>
          <span className="text-gray-300">{host.environment}</span>
        </div>
        <div>
          <span className="text-gray-500">IP: </span>
          <span className="text-gray-300">{host.ipAddresses.join(', ') || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Site: </span>
          <span className="text-gray-300">{host.site}</span>
        </div>
        <div>
          <span className="text-gray-500">Subnet: </span>
          <span className="text-gray-300">{host.subnet}</span>
        </div>
        <div>
          <span className="text-gray-500">Source: </span>
          <span className="text-gray-300">{host.sourceSystem}</span>
        </div>
        <div>
          <span className="text-gray-500">Users: </span>
          <span className="text-gray-300">{host.accessibleUserCount}</span>
        </div>
        <div>
          <span className="text-gray-500">Groups: </span>
          <span className="text-gray-300">{host.accessibleGroupCount}</span>
        </div>
        <div>
          <span className="text-gray-500">Sudo: </span>
          <span className="text-gray-300">{host.sudoEnabledIdentityCount}</span>
        </div>
        <div>
          <span className="text-gray-500">SSH: </span>
          <span className="text-gray-300">{host.sshEnabledIdentityCount}</span>
        </div>
      </div>
    </div>
  )
}
