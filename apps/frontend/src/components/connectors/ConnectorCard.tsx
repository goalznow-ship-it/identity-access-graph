import type { Connector } from '../../types/connector'
import { ConnectorStatusBadge } from './ConnectorStatusBadge'

function endpointLabel(connector: Connector): string {
  const configuration = connector.configuration
  switch (connector.connectorType) {
    case 'FREEIPA':
      return configuration.freeipaUrl ?? 'FreeIPA endpoint not configured'
    case 'LINUX_SSH':
      return configuration.sshHost
        ? `${configuration.sshHost}:${configuration.sshPort ?? 22}`
        : 'SSH host not configured'
    case 'ENTRA_ID':
      return configuration.entraTenantId ?? 'Entra tenant not configured'
    default:
      return configuration.url ?? 'LDAP endpoint not configured'
  }
}

interface ConnectorCardProps {
  connector: Connector
  onEdit: () => void
  onTest: () => void
  onPreview: () => void
  onSync: () => void
  onToggle: () => void
  onDelete: () => void
}

export function ConnectorCard({
  connector,
  onEdit,
  onTest,
  onPreview,
  onSync,
  onToggle,
  onDelete,
}: ConnectorCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex justify-between">
        <div>
          <h2 className="font-semibold">{connector.name}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {connector.connectorType} · {endpointLabel(connector)}
          </p>
        </div>
        <ConnectorStatusBadge status={connector.status} />
      </div>
      {connector.lastError && <p className="mt-2 text-xs text-danger">{connector.lastError}</p>}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button onClick={onTest} className="rounded border border-border px-2 py-1">Test</button>
        <button onClick={onPreview} className="rounded border border-border px-2 py-1">Preview</button>
        <button
          onClick={onSync}
          disabled={!connector.enabled}
          title={!connector.enabled ? 'Enable connector before synchronization' : 'Start full synchronization'}
          className="rounded border border-border px-2 py-1 disabled:opacity-40"
        >
          Sync
        </button>
        <button onClick={onEdit} className="rounded border border-border px-2 py-1">Edit</button>
        <button onClick={onToggle} className="rounded border border-border px-2 py-1">
          {connector.enabled ? 'Disable' : 'Enable'}
        </button>
        <button onClick={onDelete} className="rounded px-2 py-1 text-danger">Delete</button>
      </div>
    </article>
  )
}
