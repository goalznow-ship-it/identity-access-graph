import { getNodeById } from '../../services/linuxGraphAdapter'
import type { LinuxHostSummary } from '../../types/linux'

interface LinuxHostPropertiesProps {
  host: LinuxHostSummary
}

const skipKeys = new Set([
  'id', 'displayName', 'nodeType', 'sourceSystem', 'riskLevel', 'description',
  'sourceId', 'metadata', 'createdAt', 'updatedAt', 'status', 'enabled', 'deleted',
  'critical', 'operatingSystemId', 'hostname', 'fqdn', 'ipAddresses', 'ipAddress',
])

export function LinuxHostProperties({ host }: LinuxHostPropertiesProps) {
  const node = getNodeById(host.id)
  if (!node) return <p className="text-sm text-gray-500">No properties available.</p>

  const props = Object.entries(node.properties).filter(([k]) => !skipKeys.has(k))

  if (props.length === 0) {
    return <p className="text-sm text-gray-500">No additional properties.</p>
  }

  return (
    <div className="space-y-1">
      {props.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
          <span className="shrink-0 font-medium text-gray-500">{k}:</span>
          <span className="break-all text-gray-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
    </div>
  )
}
