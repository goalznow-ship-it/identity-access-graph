import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchBox } from '../ui/SearchBox'
import { Badge } from '../ui/Badge'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { EmptyState } from '../ui/EmptyState'
import type { LinuxHostSummary, LinuxHostFilters } from '../../types/linux'

const riskBadge: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
  NONE: 'primary', LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger',
}

interface LinuxHostListProps {
  hosts: LinuxHostSummary[]
  loading: boolean
  error: string | null
  selectedHostId: string | null
  onSelect: (hostId: string) => void
  filters: LinuxHostFilters
  onFiltersChange: (filters: LinuxHostFilters) => void
  environments: string[]
  operatingSystems: string[]
  sourceSystems: string[]
  search: string
  onSearchChange: (v: string) => void
}

export function LinuxHostList({
  hosts, loading, error, selectedHostId, onSelect,
  filters, onFiltersChange, environments, operatingSystems, sourceSystems,
  search, onSearchChange,
}: LinuxHostListProps) {
  const [showFilters, setShowFilters] = useState(false)

  const toggleArrayFilter = (key: 'environment' | 'operatingSystem' | 'sourceSystem' | 'riskLevel', value: string) => {
    const current = filters[key] as string[]
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    onFiltersChange({ ...filters, [key]: next })
  }

  const selectFilter = (key: 'sshAccess' | 'sudoAccess' | 'privilegedAccess' | 'hasApplication' | 'hasDatabase', value: string) => {
    onFiltersChange({ ...filters, [key]: value === filters[key] ? '' : value })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 space-y-2">
        <SearchBox
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search hosts..."
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs font-medium text-primary hover:text-primary/80"
        >
          {showFilters ? 'Hide filters' : 'Show filters'} ({Object.entries(filters).filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true)).length})
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 space-y-2 overflow-hidden"
          >
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Environment</p>
              <div className="flex flex-wrap gap-1">
                {environments.map((e) => (
                  <button key={e} onClick={() => toggleArrayFilter('environment', e)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${filters.environment.includes(e) ? 'bg-primary-muted text-primary' : 'bg-card text-gray-400 hover:text-gray-200'}`}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">OS</p>
              <div className="flex flex-wrap gap-1">
                {operatingSystems.map((os) => (
                  <button key={os} onClick={() => toggleArrayFilter('operatingSystem', os)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${filters.operatingSystem.includes(os) ? 'bg-primary-muted text-primary' : 'bg-card text-gray-400 hover:text-gray-200'}`}
                  >{os}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Source</p>
              <div className="flex flex-wrap gap-1">
                {sourceSystems.map((s) => (
                  <button key={s} onClick={() => toggleArrayFilter('sourceSystem' as any, s)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${filters.sourceSystem.includes(s as any) ? 'bg-primary-muted text-primary' : 'bg-card text-gray-400 hover:text-gray-200'}`}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={filters.sshAccess === 'yes'} onChange={() => selectFilter('sshAccess', 'yes')} className="accent-primary" />
                SSH Access
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={filters.sudoAccess === 'yes'} onChange={() => selectFilter('sudoAccess', 'yes')} className="accent-primary" />
                Sudo Access
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={filters.privilegedAccess === 'yes'} onChange={() => selectFilter('privilegedAccess', 'yes')} className="accent-primary" />
                Privileged
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={filters.hasApplication === 'yes'} onChange={() => selectFilter('hasApplication', 'yes')} className="accent-primary" />
                Has App
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={filters.hasDatabase === 'yes'} onChange={() => selectFilter('hasDatabase', 'yes')} className="accent-primary" />
                Has DB
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
        ) : error ? (
          <EmptyState title="Error" description={error} />
        ) : hosts.length === 0 ? (
          <EmptyState title="No hosts found" description="Try adjusting your filters." />
        ) : (
          hosts.map((host, i) => (
            <motion.button
              key={host.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => onSelect(host.id)}
              className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                selectedHostId === host.id
                  ? 'border-primary/50 bg-primary-muted/30'
                  : 'border-border bg-card hover:border-primary/20 hover:bg-card/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-100">{host.hostname}</p>
                  <p className="truncate text-xs text-gray-500">{host.fqdn}</p>
                </div>
                <Badge variant={riskBadge[host.riskLevel] || 'primary'}>{host.riskLevel}</Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">{host.operatingSystem}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">{host.environment}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">{host.sourceSystem}</span>
              </div>
              <div className="mt-1.5 flex gap-3 text-[10px] text-gray-500">
                <span>{host.accessibleUserCount} users</span>
                <span>{host.accessibleGroupCount} groups</span>
                <span>{host.sudoEnabledIdentityCount} sudo</span>
                <span>{host.sshEnabledIdentityCount} ssh</span>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}
