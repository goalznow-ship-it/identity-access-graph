import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { Membership } from '../../types/identity'

interface MembershipPanelProps {
  directGroups: Membership[]
  indirectGroups: Membership[]
  roles: Membership[]
  permissions: Membership[]
}

const typeColors: Record<string, 'primary' | 'success' | 'warning' | 'accent'> = {
  GROUP: 'success',
  ROLE: 'warning',
  PERMISSION: 'accent',
}

function MembershipList({ label, memberships, emptyMsg }: { label: string; memberships: Membership[]; emptyMsg: string }) {
  if (memberships.length === 0) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-gray-300">{label}</p>
        <Card className="p-4">
          <p className="text-sm text-gray-500">{emptyMsg}</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-300">
        {label} ({memberships.length})
      </p>
      <div className="space-y-1.5">
        {memberships.map((m) => (
          <div key={m.node.id} className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge variant={typeColors[m.node.nodeType] ?? 'primary'}>{m.node.nodeType}</Badge>
              <span className="text-sm text-gray-200">{m.node.displayName}</span>
            </div>
            {!m.direct && (
              <span className="text-xs text-gray-500">Indirect</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MembershipPanel({ directGroups, indirectGroups, roles, permissions }: MembershipPanelProps) {
  return (
    <div className="space-y-6">
      <MembershipList label="Direct Groups" memberships={directGroups} emptyMsg="No direct group memberships" />
      <MembershipList label="Indirect Groups" memberships={indirectGroups} emptyMsg="No indirect group memberships" />
      <MembershipList label="Roles" memberships={roles} emptyMsg="No roles assigned" />
      <MembershipList label="Permissions" memberships={permissions} emptyMsg="No permissions granted" />
    </div>
  )
}
