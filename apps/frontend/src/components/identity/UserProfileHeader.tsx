import { Badge } from '../ui/Badge'
import type { UserIdentity } from '../../types/identity'

interface UserProfileHeaderProps {
  user: UserIdentity
}

const statusBadge: Record<string, 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  DISABLED: 'danger',
  INACTIVE: 'warning',
  LOCKED: 'danger',
}

const riskBadge: Record<string, 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const n = user.node

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted text-lg font-bold text-primary">
            {(n.displayName[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-100">{n.displayName}</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {user.jobTitle ?? 'No title'}
              {user.departmentId && ` · ${user.departmentId}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="primary">{n.nodeType}</Badge>
              <Badge variant={statusBadge[n.properties?.status as string] ?? 'success'}>
                {n.properties?.status as string ?? 'UNKNOWN'}
              </Badge>
              <Badge variant={riskBadge[n.riskLevel] ?? 'success'}>{n.riskLevel}</Badge>
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>ID: {n.id}</p>
          <p>Source: {n.sourceSystem}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
        <Field label="Email" value={user.email} />
        <Field label="Username" value={user.principalName} />
        <Field label="SAM Account" value={user.samAccountName} />
        <Field label="Employee ID" value={user.employeeId} />
        <Field label="First Name" value={user.firstName} />
        <Field label="Last Name" value={user.lastName} />
        <Field label="Office" value={user.officeLocation} />
        <Field label="MFA" value={user.mfaEnabled ? 'Enabled' : 'Disabled'} />
        <Field label="Locked" value={user.locked ? 'Yes' : 'No'} />
        <Field label="Source ID" value={user.sourceId} />
        <Field label="Source System" value={n.sourceSystem} />
        <Field label="Last Updated" value={n.properties?.updatedAt as string} />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-gray-500">{label}</span>
      <p className="mt-0.5 font-medium text-gray-200">{value ?? '—'}</p>
    </div>
  )
}
