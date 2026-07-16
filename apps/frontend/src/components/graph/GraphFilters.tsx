import { useState } from 'react'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'
import type { GraphFiltersState, SourceSystem, NodeType, RelationshipType, RiskLevel } from '../../types/graph'

interface GraphFiltersProps {
  filters: GraphFiltersState
  allNodeTypes: string[]
  allRelationshipTypes: string[]
  allSourceSystems: string[]
  allRiskLevels: string[]
  allStatuses: string[]
  allAccessTypes: string[]
  onSystemFilter: (systems: SourceSystem[]) => void
  onNodeTypeFilter: (types: NodeType[]) => void
  onRelationshipTypeFilter: (types: RelationshipType[]) => void
  onRiskLevelFilter: (levels: RiskLevel[]) => void
  onStatusFilter: (statuses: string[]) => void
  onAccessFilter: (types: RelationshipType[]) => void
  onPreset: (preset: 'privileged' | 'highRisk' | 'identities' | 'infrastructure') => void
  onReset: () => void
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val]
    onChange(next)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs text-gray-300 hover:border-gray-600"
      >
        <span>{selected.length > 0 ? `${selected.length} selected` : `All ${label}`}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-glass">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-border bg-card text-primary focus:ring-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function GraphFilters(props: GraphFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Filters</span>
        <Button variant="ghost" size="sm" onClick={props.onReset}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1">{([['privileged','Privileged'],['highRisk','High risk'],['identities','Identities'],['infrastructure','Infrastructure']] as const).map(([value,label]) => <button key={value} onClick={() => props.onPreset(value)} className="rounded bg-card px-2 py-1 text-[10px] text-gray-300 hover:bg-white/5">{label}</button>)}</div>

      <Section title="Source System">
        <MultiSelect
          label="systems"
          options={props.allSourceSystems}
          selected={props.filters.systems}
          onChange={(v) => props.onSystemFilter(v as SourceSystem[])}
        />
      </Section>

      <Section title="Node Type">
        <MultiSelect
          label="node types"
          options={props.allNodeTypes}
          selected={props.filters.nodeTypes}
          onChange={(v) => props.onNodeTypeFilter(v as NodeType[])}
        />
      </Section>

      <Section title="Relationship Type">
        <MultiSelect
          label="relation types"
          options={props.allRelationshipTypes}
          selected={props.filters.relationshipTypes}
          onChange={(v) => props.onRelationshipTypeFilter(v as RelationshipType[])}
        />
      </Section>

      <Section title="Risk Level">
        <MultiSelect
          label="risk levels"
          options={props.allRiskLevels}
          selected={props.filters.riskLevels}
          onChange={(v) => props.onRiskLevelFilter(v as RiskLevel[])}
        />
      </Section>
      <Section title="Status"><MultiSelect label="statuses" options={props.allStatuses} selected={props.filters.statuses} onChange={props.onStatusFilter} /></Section>
      <Section title="Access"><MultiSelect label="access types" options={props.allAccessTypes} selected={props.filters.accessTypes} onChange={(values) => props.onAccessFilter(values as RelationshipType[])} /></Section>
    </div>
  )
}
