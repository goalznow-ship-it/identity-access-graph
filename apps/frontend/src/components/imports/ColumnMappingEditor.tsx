import { useState } from 'react'
import { Search, Download, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { ColumnMappingRow } from './ColumnMappingRow'
import { MappingConfidenceBadge } from './MappingConfidenceBadge'
import type { ColumnMapping, TargetField } from '../../types/import'

interface ColumnMappingEditorProps {
  mappings: ColumnMapping[]
  targetFields: TargetField[]
  onMappingsChange: (mappings: ColumnMapping[]) => void
  requiredFields?: string[]
  onValidate?: () => void
  onApply?: () => void
}

export const TARGET_FIELD_CATEGORIES = [
  { label: 'Common', fields: ['id', 'externalId', 'sourceId', 'displayName', 'description', 'sourceSystem', 'status', 'riskLevel'] },
  { label: 'Identity', fields: ['username', 'samAccountName', 'userPrincipalName', 'employeeId', 'email', 'department', 'team', 'manager', 'jobTitle', 'office', 'distinguishedName', 'objectGUID', 'sid', 'primaryGroupId', 'memberOf'] },
  { label: 'Group', fields: ['groupName', 'groupType', 'members', 'parentGroup', 'distinguishedName', 'objectGUID', 'sid'] },
  { label: 'Infrastructure', fields: ['hostname', 'fqdn', 'ipAddress', 'operatingSystem', 'environment', 'domain', 'ou', 'site', 'subnet'] },
  { label: 'Linux', fields: ['uid', 'gid', 'shell', 'homeDirectory', 'linuxGroups', 'sudoUser', 'sudoHost', 'sudoCommand', 'sshPublicKey'] },
  { label: 'Business', fields: ['applicationName', 'databaseName', 'businessService', 'owner', 'businessUnit', 'classification'] },
]

export function ColumnMappingEditor({
  mappings,
  targetFields,
  onMappingsChange,
  requiredFields = [],
  onValidate,
  onApply,
}: ColumnMappingEditorProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped' | 'required' | 'duplicate'>('all')

  const filteredMappings = mappings.filter((m) => {
    const matchesSearch = m.sourceColumn.toLowerCase().includes(search.toLowerCase()) ||
      m.targetField.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'mapped' && !m.ignored && m.confidence > 0) ||
      (filter === 'unmapped' && (m.ignored || m.confidence === 0)) ||
      (filter === 'required' && requiredFields.includes(m.sourceColumn)) ||
      (filter === 'duplicate' && m.duplicateTarget)
    return matchesSearch && matchesFilter
  })

  const mappedCount = mappings.filter((m) => !m.ignored && m.confidence > 0).length
  const unmappedCount = mappings.filter((m) => m.ignored || m.confidence === 0).length
  const duplicateCount = mappings.filter((m) => m.duplicateTarget).length
  const requiredCount = mappings.filter((m) => requiredFields.includes(m.sourceColumn)).length

  const handleUpdate = (sourceColumn: string, targetField: string, ignored: boolean) => {
    const updated = mappings.map((m) =>
      m.sourceColumn === sourceColumn ? { ...m, targetField, ignored, confidence: ignored ? 0 : 100, duplicateTarget: false } : m
    )
    // Check for duplicate targets
    const targetCounts = new Map<string, number>()
    updated.forEach((m) => {
      if (!m.ignored && m.targetField !== 'ignore') {
        targetCounts.set(m.targetField, (targetCounts.get(m.targetField) ?? 0) + 1)
      }
    })
    const finalMappings = updated.map((m) => ({
      ...m,
      duplicateTarget: !m.ignored && m.targetField !== 'ignore' && (targetCounts.get(m.targetField) ?? 0) > 1,
    }))
    onMappingsChange(finalMappings)
  }

  const handleIgnore = (sourceColumn: string, ignored: boolean) => {
    const updated = mappings.map((m) =>
      m.sourceColumn === sourceColumn ? { ...m, ignored, confidence: ignored ? 0 : m.confidence, targetField: ignored ? 'ignore' : m.targetField } : m
    )
    onMappingsChange(updated)
  }

  const isRequired = (sourceColumn: string) => requiredFields.includes(sourceColumn)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-primary"
        >
          <option value="all">All ({mappings.length})</option>
          <option value="mapped">Mapped ({mappedCount})</option>
          <option value="unmapped">Unmapped ({unmappedCount})</option>
          <option value="required">Required ({requiredCount})</option>
          <option value="duplicate">Duplicates ({duplicateCount})</option>
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={onValidate} disabled={mappedCount === 0}>
            <AlertTriangle className="h-4 w-4 mr-1" />
            Validate
          </Button>
          <Button variant="primary" size="sm" onClick={onApply} disabled={mappedCount === 0}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Apply Mappings
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Mapped: {mappedCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-500" />
          <span>Unmapped: {unmappedCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Required: {requiredCount}</span>
        </div>
        {duplicateCount > 0 && (
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            <span className="text-yellow-400">Duplicates: {duplicateCount}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900/50 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700">
          <div className="col-span-3">Source Column</div>
          <div className="col-span-3">Sample Values</div>
          <div className="col-span-3">Target Field</div>
          <div className="col-span-2">Confidence</div>
          <div className="col-span-1">Required</div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredMappings.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No columns match the current filter
            </div>
          ) : (
            filteredMappings.map((mapping) => (
              <ColumnMappingRow
                key={mapping.sourceColumn}
                mapping={mapping}
                targetFields={targetFields.length > 0 ? targetFields : TARGET_FIELD_CATEGORIES.flatMap((category) =>
                  category.fields.map((field) => ({ field, category: category.label, required: false })),
                )}
                onUpdate={handleUpdate}
                onIgnore={handleIgnore}
                requiredFields={requiredFields}
                isRequired={isRequired(mapping.sourceColumn)}
              />
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
        <div>
          <strong>Confidence Legend:</strong>
          <div className="flex flex-wrap gap-2 mt-1">
            <MappingConfidenceBadge confidence={100} />
            <MappingConfidenceBadge confidence={90} />
            <MappingConfidenceBadge confidence={70} />
            <MappingConfidenceBadge confidence={40} />
            <MappingConfidenceBadge confidence={0} />
          </div>
        </div>
        <div>
          <strong>Icons:</strong>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-3 w-3" /> Exact match (100%)</span>
            <span className="flex items-center gap-1 text-yellow-400"><AlertTriangle className="h-3 w-3" /> Alias match (90%)</span>
            <span className="flex items-center gap-1 text-blue-400"><Info className="h-3 w-3" /> Partial match (70%)</span>
            <span className="flex items-center gap-1 text-purple-400"><Download className="h-3 w-3" /> Dataset hint (40%)</span>
            <span className="flex items-center gap-1 text-red-400"><AlertCircle className="h-3 w-3" /> Duplicate target</span>
          </div>
        </div>
      </div>
    </div>
  )
}
