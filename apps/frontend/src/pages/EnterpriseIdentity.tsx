import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, AlertTriangle, Shield, Users, Key, Server, Terminal, ExternalLink, Activity, RefreshCw, Search } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { listEnterpriseIdentities, getEnterpriseIdentity, getEnterpriseTimeline, getEnterpriseConflicts } from '../services/enterpriseIdentityApi'
import type { EnterpriseIdentity, MergeSource, ConfidenceLevel } from '../types/enterprise-identity'

const SOURCE_COLORS: Record<MergeSource, string> = {
  ACTIVE_DIRECTORY: 'bg-blue-500',
  ENTRA_ID: 'bg-purple-500',
  FREE_IPA: 'bg-teal-500',
  LINUX: 'bg-green-500',
  LDAP: 'bg-orange-500',
  CUSTOM: 'bg-gray-500',
  MANUAL: 'bg-yellow-500',
}

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  EXACT: 'text-green-400',
  VERY_HIGH: 'text-emerald-400',
  HIGH: 'text-blue-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-orange-400',
  NONE: 'text-red-400',
}

export function EnterpriseIdentityPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedId = searchParams.get('id')
  const [identities, setIdentities] = useState<EnterpriseIdentity[]>([])
  const [selected, setSelected] = useState<EnterpriseIdentity | null>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ sources: true, fields: true, conflicts: true, accounts: true, groups: true, roles: true, permissions: true, applications: true, servers: true, sudo: true, ssh: true, timeline: true })

  useEffect(() => {
    listEnterpriseIdentities()
      .then((data) => {
        setIdentities(data)
        if (selectedId) {
          const found = data.find((i) => i.id === selectedId || i.canonicalIdentityId === selectedId)
          if (found) setSelected(found)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedId])

  useEffect(() => {
    if (!selected) return
    getEnterpriseTimeline(selected.id).then(setTimeline).catch(() => {})
    getEnterpriseConflicts(selected.id).then(setConflicts).catch(() => {})
  }, [selected?.id])

  const filtered = useMemo(() => {
    if (!search) return identities
    const q = search.toLowerCase()
    return identities.filter(
      (i) =>
        i.displayName.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.mergedSources.some((s) => s.displayName.toLowerCase().includes(q)),
    )
  }, [identities, search])

  const toggleSection = (key: string) => setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const selectIdentity = async (id: string) => {
    navigate(`/enterprise-identity?id=${id}`, { replace: true })
    try {
      const identity = await getEnterpriseIdentity(id)
      setSelected(identity)
    } catch { }
  }

  if (loading) {
    return (
      <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center p-4">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
        <p className="mt-2 text-sm text-gray-500">Loading enterprise identities...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Enterprise Identity</h1>
          <p className="text-sm text-gray-500">
            Merged identities across Active Directory, Entra ID, FreeIPA, and Linux.
          </p>
        </div>
        <Button variant="ghost" onClick={() => listEnterpriseIdentities().then(setIdentities)} className="flex items-center gap-1 text-xs">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search identities..."
              className="w-full rounded border border-border bg-surface py-1.5 pl-7 pr-2 text-xs text-gray-200 placeholder-gray-500"
            />
          </div>

          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-gray-500">
              {search ? 'No identities match your search.' : 'No enterprise identities yet. Run a correlation to get started.'}
            </p>
          )}

          {filtered.map((identity) => (
            <button
              key={identity.id}
              onClick={() => selectIdentity(identity.id)}
              className={`w-full rounded-lg border p-2.5 text-left text-xs transition-colors ${
                selected?.id === identity.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-200 truncate">{identity.displayName}</span>
                <span className={`shrink-0 font-mono ${CONFIDENCE_COLORS[identity.confidenceLevel]}`}>{identity.confidence}</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                {identity.mergedSources.map((s) => (
                  <span key={s.source} className={`inline-block h-2 w-2 rounded-full ${SOURCE_COLORS[s.source]}`} title={s.source} />
                ))}
                <span className="ml-auto text-gray-500">{identity.mergedSources.length} source(s)</span>
              </div>
              {identity.conflicts.length > 0 && (
                <div className="mt-1 flex items-center gap-1 text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{identity.conflicts.length} conflict(s)</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selected && (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Select an enterprise identity to view details.
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-100">{selected.displayName}</h2>
                    <Badge variant="outline" className={CONFIDENCE_COLORS[selected.confidenceLevel]}>
                      {selected.confidenceLevel} ({selected.confidence})
                    </Badge>
                    <Badge variant={selected.conflicts.length > 0 ? 'danger' : 'secondary'}>
                      {selected.conflicts.length} conflict(s)
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    <code className="text-primary">{selected.canonicalIdentityId.substring(0, 16)}...</code>
                    &middot; {selected.mergedSources.length} sources &middot; Created {new Date(selected.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="flex items-center gap-1 text-xs" onClick={() => window.open(`/graph?nodeId=${selected.canonicalIdentityId}`, '_blank')}>
                    <ExternalLink className="h-3 w-3" /> Graph
                  </Button>
                  <Button variant="ghost" className="flex items-center gap-1 text-xs" onClick={() => window.open(`/attack-paths?identityId=${selected.canonicalIdentityId}`, '_blank')}>
                    <Shield className="h-3 w-3" /> Attack Path
                  </Button>
                  <Button variant="ghost" className="flex items-center gap-1 text-xs" onClick={() => window.open(`/risk?identityId=${selected.canonicalIdentityId}`, '_blank')}>
                    <AlertTriangle className="h-3 w-3" /> Risk
                  </Button>
                </div>
              </div>

              <Section title="Merged Sources" expandedKey="sources" expanded={expandedSections.sources} onToggle={toggleSection}>
                <div className="space-y-2">
                  {selected.mergedSources.map((source) => (
                    <div key={`${source.source}-${source.nodeId}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-xs">
                      <span className={`h-3 w-3 shrink-0 rounded-full ${SOURCE_COLORS[source.source]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-200">{source.source}</span>
                          <span className="text-gray-500">&middot;</span>
                          <span className="text-gray-400 truncate">{source.displayName}</span>
                          <span className={CONFIDENCE_COLORS[toConfidenceLevel(source.confidence)]}>{source.confidence}</span>
                        </div>
                        {source.matchedFields.length > 0 && (
                          <p className="mt-0.5 text-gray-500">Matched on: {source.matchedFields.join(', ')}</p>
                        )}
                        <p className="text-gray-600">Last seen: {new Date(source.lastSeen).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Matched Fields" expandedKey="fields" expanded={expandedSections.fields} onToggle={toggleSection}>
                {selected.matchedFields.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500">No matched fields.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          <th className="px-3 py-2 text-left text-gray-400">Field</th>
                          <th className="px-3 py-2 text-left text-gray-400">Source A Value</th>
                          <th className="px-3 py-2 text-left text-gray-400">Source B Value</th>
                          <th className="px-3 py-2 text-left text-gray-400">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.matchedFields.map((f, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-medium text-gray-300">{f.field}</td>
                            <td className={`px-3 py-2 ${f.matchType === 'conflict' ? 'text-red-400' : 'text-gray-400'}`}>{f.valueA}</td>
                            <td className={`px-3 py-2 ${f.matchType === 'conflict' ? 'text-red-400' : 'text-gray-400'}`}>{f.valueB}</td>
                            <td className="px-3 py-2">
                              <Badge variant={f.matchType === 'exact' ? 'success' : 'danger'}>{f.matchType}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              <Section title="Conflicts" expandedKey="conflicts" expanded={expandedSections.conflicts} onToggle={toggleSection}>
                {conflicts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500">No conflicts.</p>
                ) : (
                  <div className="space-y-2">
                    {conflicts.map((c, i) => (
                      <div key={i} className="rounded-lg border border-yellow-800 bg-yellow-900/10 p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                          <span className="font-medium text-yellow-200">{c.field}</span>
                          <Badge variant={c.severity === 'critical' ? 'danger' : c.severity === 'warning' ? 'warning' : 'secondary'}>{c.severity}</Badge>
                        </div>
                        <p className="mt-1 text-yellow-300/80">
                          <span className="font-medium text-blue-400">{c.sourceA}</span>: {c.valueA}
                          &nbsp;vs&nbsp;
                          <span className="font-medium text-purple-400">{c.sourceB}</span>: {c.valueB}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Accounts" expandedKey="accounts" expanded={expandedSections.accounts} onToggle={toggleSection}>
                {selected.accounts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500">No accounts.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selected.accounts.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                        <span className={`shrink-0 h-2.5 w-2.5 rounded-full ${a.disabled ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="font-medium text-gray-300">{a.accountName}</span>
                        <Badge variant="outline">{a.source}</Badge>
                        {a.domain && <span className="text-gray-500">{a.domain}</span>}
                        {a.disabled && <span className="text-red-400">Disabled</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <ItemsSection title="Groups" icon={<Users className="h-3.5 w-3.5" />} items={selected.groups} emptyText="No groups." expandedKey="groups" expanded={expandedSections.groups} onToggle={toggleSection} />
              <ItemsSection title="Roles" icon={<Key className="h-3.5 w-3.5" />} items={selected.roles} emptyText="No roles." expandedKey="roles" expanded={expandedSections.roles} onToggle={toggleSection} />
              <ItemsSection title="Permissions" icon={<Shield className="h-3.5 w-3.5" />} items={selected.permissions} emptyText="No permissions." expandedKey="permissions" expanded={expandedSections.permissions} onToggle={toggleSection} />
              <ItemsSection title="Applications" icon={<Activity className="h-3.5 w-3.5" />} items={selected.applications} emptyText="No applications." expandedKey="applications" expanded={expandedSections.applications} onToggle={toggleSection} />
              <ItemsSection title="Servers" icon={<Server className="h-3.5 w-3.5" />} items={selected.servers} emptyText="No servers." expandedKey="servers" expanded={expandedSections.servers} onToggle={toggleSection} />
              <ItemsSection title="Sudo Policies" icon={<Terminal className="h-3.5 w-3.5" />} items={selected.sudoPolicies} emptyText="No sudo policies." expandedKey="sudo" expanded={expandedSections.sudo} onToggle={toggleSection} />
              <ItemsSection title="SSH Keys" icon={<Key className="h-3.5 w-3.5" />} items={selected.sshKeys} emptyText="No SSH keys." expandedKey="ssh" expanded={expandedSections.ssh} onToggle={toggleSection} />

              <Section title="Timeline" expandedKey="timeline" expanded={expandedSections.timeline} onToggle={toggleSection}>
                {timeline.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500">No timeline events.</p>
                ) : (
                  <div className="space-y-1.5">
                    {timeline.map((event, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-300 capitalize">{event.type.replace(/_/g, ' ')}</span>
                            {event.source && <Badge variant="outline">{event.source}</Badge>}
                            <span className="ml-auto text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="mt-0.5 text-gray-400">{event.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <div className="rounded-lg border border-border bg-card p-4 text-xs">
                <p className="font-medium text-gray-300">Merge Statistics</p>
                <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <span className="text-gray-500">Sources</span>
                    <p className="text-lg text-gray-100">{selected.statistics.totalSources}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Matched Fields</span>
                    <p className="text-lg text-gray-100">{selected.statistics.matchedFields}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Conflicts</span>
                    <p className="text-lg text-red-400">{selected.statistics.totalConflicts}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidence</span>
                    <p className={`text-lg ${CONFIDENCE_COLORS[selected.confidenceLevel]}`}>{selected.statistics.confidenceScore}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, expandedKey, expanded, onToggle, children }: { title: string; expandedKey: string; expanded: boolean; onToggle: (key: string) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <button onClick={() => onToggle(expandedKey)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-medium text-gray-300 hover:bg-white/[0.02]">
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function ItemsSection({ title, icon, items, emptyText, expandedKey, expanded, onToggle }: { title: string; icon: React.ReactNode; items: string[]; emptyText: string; expandedKey: string; expanded: boolean; onToggle: (key: string) => void }) {
  return (
    <Section title={title} expandedKey={expandedKey} expanded={expanded} onToggle={onToggle}>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-500">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-gray-300">
              {icon}
              {item}
            </span>
          ))}
        </div>
      )}
    </Section>
  )
}

function toConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 100) return 'EXACT'
  if (score >= 90) return 'VERY_HIGH'
  if (score >= 80) return 'HIGH'
  if (score >= 70) return 'MEDIUM'
  if (score >= 50) return 'LOW'
  return 'NONE'
}
