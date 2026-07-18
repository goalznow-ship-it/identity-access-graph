import { useState, useRef, useEffect } from 'react'
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val]
    onChange(next)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs text-gray-300 transition hover:border-gray-600"
      >
        <span className={selected.length > 0 ? 'text-gray-200' : 'text-gray-500'}>{selected.length > 0 ? `${selected.length} selected` : `All ${label}`}</span>
        <svg className={`h-3 w-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-2xl">
          {selected.length > 1 && (
            <button onClick={() => onChange([])} className="mb-1 w-full rounded-lg px-2 py-1 text-left text-[10px] text-gray-500 transition hover:bg-white/5">Clear selection</button>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-300 transition hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-3.5 w-3.5 rounded border-border bg-card text-primary focus:ring-2 focus:ring-primary/50"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const PRESETS = [
  { key: 'privileged', label: 'Privileged', icon: '⚡' },
  { key: 'highRisk', label: 'High Risk', icon: '⚠' },
  { key: 'identities', label: 'Identities', icon: '👤' },
  { key: 'infrastructure', label: 'Infra', icon: '🖥' },
] as const

export function GraphFilters(props: GraphFiltersProps) {
  const count = Object.values(props.filters).reduce((sum, arr) => sum + arr.length, 0)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Filters{count > 0 && <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] text-primary">{count}</span>}
        </span>
        <button onClick={props.onReset} className="rounded-lg px-2 py-1 text-[10px] text-gray-500 transition hover:bg-white/5 hover:text-gray-300">
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => props.onPreset(key as 'privileged' | 'highRisk' | 'identities' | 'infrastructure')} className="flex items-center gap-1 rounded-lg bg-card px-2 py-1.5 text-[10px] text-gray-400 transition hover:bg-white/5 hover:text-gray-200">
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      <FilterGroup title="Source System">
        <MultiSelect label="systems" options={props.allSourceSystems} selected={props.filters.systems} onChange={(v) => props.onSystemFilter(v as SourceSystem[])} />
      </FilterGroup>
      <FilterGroup title="Node Type">
        <MultiSelect label="node types" options={props.allNodeTypes} selected={props.filters.nodeTypes} onChange={(v) => props.onNodeTypeFilter(v as NodeType[])} />
      </FilterGroup>
      <FilterGroup title="Relationship">
        <MultiSelect label="relation types" options={props.allRelationshipTypes} selected={props.filters.relationshipTypes} onChange={(v) => props.onRelationshipTypeFilter(v as RelationshipType[])} />
      </FilterGroup>
      <FilterGroup title="Risk Level">
        <MultiSelect label="risk levels" options={props.allRiskLevels} selected={props.filters.riskLevels} onChange={(v) => props.onRiskLevelFilter(v as RiskLevel[])} />
      </FilterGroup>
      <FilterGroup title="Status">
        <MultiSelect label="statuses" options={props.allStatuses} selected={props.filters.statuses} onChange={props.onStatusFilter} />
      </FilterGroup>
      <FilterGroup title="Access Type">
        <MultiSelect label="access types" options={props.allAccessTypes} selected={props.filters.accessTypes} onChange={(values) => props.onAccessFilter(values as RelationshipType[])} />
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">{title}</p>
      {children}
    </div>
  )
}
