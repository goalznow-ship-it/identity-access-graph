import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { CorrelatedIdentity } from '../../types/identity'

interface IdentitySourcesProps {
  identities: CorrelatedIdentity[]
}

export function IdentitySources({ identities }: IdentitySourcesProps) {
  if (identities.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-400">No correlated identities found.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {identities.map((ci) => (
        <Card key={ci.node.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${
                ci.source === 'ACTIVE_DIRECTORY' ? 'bg-blue-500' :
                ci.source === 'FREE_IPA' ? 'bg-teal-500' :
                ci.source === 'LINUX' ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-200">{ci.node.displayName}</p>
                <p className="text-xs text-gray-500">{ci.principalName ?? ci.node.displayName}</p>
              </div>
            </div>
            <Badge variant={
              ci.source === 'ACTIVE_DIRECTORY' ? 'primary' :
              ci.source === 'FREE_IPA' ? 'accent' :
              ci.source === 'LINUX' ? 'success' : 'secondary'
            }>
              {ci.source}
            </Badge>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            {ci.email && <span>Email: {ci.email}</span>}
            {ci.uid != null && <span>UID: {ci.uid}</span>}
            {ci.lastLogin && <span>Last Login: {ci.lastLogin}</span>}
          </div>
        </Card>
      ))}
    </div>
  )
}
