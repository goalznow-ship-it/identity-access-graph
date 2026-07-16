import type { LinuxHostDetail } from '../../types/linux'

interface LinuxAccessSummaryProps {
  detail: LinuxHostDetail
}

export function LinuxAccessSummary({ detail }: LinuxAccessSummaryProps) {
  const totalSudo = detail.directLinuxUsers.filter((u) => u.sudoAccess).length +
    detail.adUsers.filter((u) => u.sudoAccess).length
  const totalSsh = detail.directLinuxUsers.filter((u) => u.sshAccess).length +
    detail.adUsers.filter((u) => u.sshAccess).length +
    detail.freeIpaUsers.filter((u) => u.sshAccess).length

  const stats = [
    { label: 'Linux Users', value: detail.directLinuxUsers.length, color: 'text-teal-400' },
    { label: 'Linux Groups', value: detail.linuxGroups.length, color: 'text-teal-400' },
    { label: 'AD Users', value: detail.adUsers.length, color: 'text-blue-400' },
    { label: 'FreeIPA Users', value: detail.freeIpaUsers.length, color: 'text-orange-400' },
    { label: 'Service Accounts', value: detail.serviceAccounts.length, color: 'text-purple-400' },
    { label: 'Sudo Policies', value: detail.sudoPolicies.length, color: 'text-red-400' },
    { label: 'SSH Keys', value: detail.sshKeys.length, color: 'text-yellow-400' },
    { label: 'Apps', value: detail.applications.length, color: 'text-cyan-400' },
    { label: 'Databases', value: detail.databases.length, color: 'text-pink-400' },
    { label: 'Business Services', value: detail.businessServices.length, color: 'text-red-400' },
    { label: 'Sudo-enabled', value: totalSudo, color: 'text-red-400' },
    { label: 'SSH-enabled', value: totalSsh, color: 'text-green-400' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-card p-3">
          <p className="text-2xl font-bold tabular-nums text-gray-100">{s.value}</p>
          <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wider ${s.color}`}>{s.label}</p>
        </div>
      ))}
    </div>
  )
}
