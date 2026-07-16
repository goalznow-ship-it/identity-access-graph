import { ChevronDown, AlertTriangle } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { MappingConfidenceBadge } from './MappingConfidenceBadge'
import type { ColumnMapping, TargetField } from '../../types/import'

interface ColumnMappingRowProps {
  mapping: ColumnMapping
  targetFields: TargetField[]
  onUpdate: (sourceColumn: string, targetField: string, ignored: boolean) => void
  onIgnore: (sourceColumn: string, ignored: boolean) => void
  requiredFields: string[]
  isRequired: boolean
}

const TARGET_FIELD_CATEGORIES = [
  { label: 'Common', fields: ['id', 'externalId', 'sourceId', 'displayName', 'description', 'sourceSystem', 'status', 'riskLevel'] },
  { label: 'Identity', fields: ['username', 'samAccountName', 'userPrincipalName', 'employeeId', 'email', 'department', 'team', 'manager', 'jobTitle', 'office', 'distinguishedName', 'objectGUID', 'sid', 'primaryGroupId', 'memberOf'] },
  { label: 'Group', fields: ['groupName', 'groupType', 'members', 'parentGroup', 'distinguishedName', 'objectGUID', 'sid'] },
  { label: 'Infrastructure', fields: ['hostname', 'fqdn', 'ipAddress', 'operatingSystem', 'environment', 'domain', 'ou', 'site', 'subnet'] },
  { label: 'Linux', fields: ['uid', 'gid', 'shell', 'homeDirectory', 'linuxGroups', 'sudoUser', 'sudoHost', 'sudoCommand', 'sshPublicKey'] },
  { label: 'Business', fields: ['applicationName', 'databaseName', 'businessService', 'owner', 'businessUnit', 'classification'] },
]

export function ColumnMappingRow({
  mapping,
  targetFields,
  onUpdate,
  onIgnore,
  requiredFields,
  isRequired,
}: ColumnMappingRowProps) {
  const ignored = mapping.ignored
  const isRequiredField = requiredFields.includes(mapping.sourceColumn) || isRequired

  const handleSelectChange = (value: string) => {
    if (value === 'ignore') {
      onIgnore(mapping.sourceColumn, true)
    } else {
      onIgnore(mapping.sourceColumn, false)
      onUpdate(mapping.sourceColumn, value, false)
    }
  }

  const sampleValues = mapping.sampleValues.filter((v) => v).slice(0, 3)
  const sampleDisplay = sampleValues.length > 0 ? sampleValues.join(', ') : '—'

  return (
    <div className={`relative grid grid-cols-12 gap-3 px-3 py-2 ${mapping.duplicateTarget ? 'bg-yellow-900/10 border-l-2 border-yellow-500' : ''} ${ignored ? 'opacity-50' : ''}`}>
      <div className="col-span-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-300 truncate">{mapping.sourceColumn}</span>
          {mapping.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
        </div>
      </div>

      <div className="col-span-3 text-xs text-gray-500 truncate" title={sampleDisplay}>
        {sampleDisplay}
      </div>

      <div className="col-span-3 relative">
        <div className="relative">
          <select
            value={ignored ? 'ignore' : mapping.targetField}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="w-full appearance-none bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 pr-8 focus:outline-none focus:border-primary"
          >
            <option value="ignore">— Ignore —</option>
            {TARGET_FIELD_CATEGORIES.map((cat) => (
              <optgroup key={cat.label} label={cat.label}>
                {cat.fields
                  .filter((f) => targetFields.some((tf) => tf.field === f))
                  .map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
        </div>
        {mapping.duplicateTarget && (
          <div className="absolute -top-6 right-0 z-10 flex items-center gap-1 rounded bg-yellow-900 px-2 py-1 text-[10px] text-yellow-300">
            <AlertTriangle className="h-2.5 w-2.5" />
            Duplicate mapping
          </div>
        )}
      </div>

      <div className="col-span-2 flex items-center justify-end gap-2">
        <MappingConfidenceBadge confidence={mapping.confidence} />
      </div>

      <div className="col-span-1 flex items-center justify-end">
        {isRequiredField && mapping.ignored && (
          <Badge variant="danger" className="text-[10px]">
            Required
          </Badge>
        )}
      </div>
    </div>
  )
}
