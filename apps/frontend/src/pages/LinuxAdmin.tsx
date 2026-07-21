import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Section } from '../components/ui/Section'
import { Card } from '../components/ui/Card'
import {
  LinuxHostList, LinuxHostHeader, LinuxAccessSummary,
  LinuxIdentityAccessCard, LinuxGroupAccessPanel,
  SSHAccessPanel, SudoAccessPanel, LinuxAccessPath,
  LinuxDependencyPanel, LinuxRiskFindings,
} from '../components/linux'
import { useLinuxHosts } from '../hooks/useLinuxHosts'
import { useLinuxHostAccess } from '../hooks/useLinuxHostAccess'
import { useLinuxAccessPaths } from '../hooks/useLinuxAccessPaths'
import { useGraphSource } from '../hooks/useGraphSource'
import { useGraphData } from '../hooks/useGraphData'
import { setLinuxGraphData } from '../services/linuxGraphAdapter'
import type { LinuxHostFilters, LinuxAdminTab } from '../types/linux'
import { Terminal, Server, Users, Key, Shield, GitBranch, AlertTriangle, Activity } from 'lucide-react'

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-primary-muted text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

export function LinuxAdminPage() {
  const { source } = useGraphSource()
  const importId = typeof localStorage === 'undefined' ? null : localStorage.getItem('lastImportId')
  const graph = useGraphData(source === 'imported' ? importId : null, source)
  const [graphRevision, setGraphRevision] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const initialHostId = searchParams.get('hostId')
  const [selectedHostId, setSelectedHostId] = useState<string | null>(initialHostId)
  const [activeTab, setActiveTab] = useState<LinuxAdminTab>('overview')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<LinuxHostFilters>({
    environment: [],
    operatingSystem: [],
    sourceSystem: [],
    riskLevel: [],
    sshAccess: '',
    sudoAccess: '',
    privilegedAccess: '',
    hasApplication: '',
    hasDatabase: '',
  })

  useEffect(() => {
    if (!graph.data) return
    setLinuxGraphData(graph.data)
    setGraphRevision((revision) => revision + 1)
  }, [graph.data])

  const { hosts, loading, error, uniqueEnvironments, uniqueOperatingSystems, uniqueSourceSystems } = useLinuxHosts(filters, search, graphRevision)
  const { detail, loading: detailLoading, reverseAccess, dependencies, riskFindings } = useLinuxHostAccess(selectedHostId, graphRevision)
  const { allPaths } = useLinuxAccessPaths(selectedHostId, graphRevision)

  useEffect(() => {
    if (initialHostId) setSelectedHostId(initialHostId)
  }, [initialHostId])

  const handleSelectHost = useCallback((hostId: string) => {
    setSelectedHostId(hostId)
    setActiveTab('overview')
    setSearchParams({ hostId })
  }, [setSearchParams])

  if (graph.loading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>
  }

  if (graph.error) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Linux graph unavailable"
          description={graph.error}
          action={<button onClick={() => void graph.retry()} className="rounded-lg bg-primary px-3 py-2 text-sm text-white">Retry</button>}
        />
      </div>
    )
  }

  if (!selectedHostId) {
    return (
      <div className="flex h-full">
        <div className="flex w-80 shrink-0 flex-col border-r border-border p-4">
          <div className="mb-4">
            <h1 className="text-base font-semibold text-gray-100">Linux Admin</h1>
            <p className="text-xs text-gray-500">Select a host from {source === 'neo4j' ? 'Neo4j Live' : 'the active import'}</p>
          </div>
          <LinuxHostList
            hosts={hosts}
            loading={loading}
            error={error}
            selectedHostId={null}
            onSelect={handleSelectHost}
            filters={filters}
            onFiltersChange={setFilters}
            environments={uniqueEnvironments}
            operatingSystems={uniqueOperatingSystems}
            sourceSystems={uniqueSourceSystems}
            search={search}
            onSearchChange={setSearch}
          />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<Terminal className="h-12 w-12" />}
            title="Select a Linux host"
            description="Choose a host from the list to view its access details."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-r border-border p-4">
        <div className="mb-4">
          <h1 className="text-base font-semibold text-gray-100">Linux Admin</h1>
          <p className="text-xs text-gray-500">{hosts.length} host(s)</p>
        </div>
        <LinuxHostList
          hosts={hosts}
          loading={loading}
          error={error}
          selectedHostId={selectedHostId}
          onSelect={handleSelectHost}
          filters={filters}
          onFiltersChange={setFilters}
          environments={uniqueEnvironments}
          operatingSystems={uniqueOperatingSystems}
          sourceSystems={uniqueSourceSystems}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {detailLoading ? (
          <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>
        ) : !detail ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="Host not found" description="The selected host could not be loaded." />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-4 border-b border-border p-4 pb-3">
              <LinuxHostHeader host={detail.host} />
              <LinuxAccessSummary detail={detail} />

              <div className="flex flex-wrap gap-1.5">
                <TabButton active={activeTab === 'overview'} icon={Server} label="Overview" onClick={() => setActiveTab('overview')} />
                <TabButton active={activeTab === 'users-groups'} icon={Users} label="Users & Groups" onClick={() => setActiveTab('users-groups')} />
                <TabButton active={activeTab === 'ssh-access'} icon={Key} label="SSH Access" onClick={() => setActiveTab('ssh-access')} />
                <TabButton active={activeTab === 'sudo-access'} icon={Shield} label="Sudo Access" onClick={() => setActiveTab('sudo-access')} />
                <TabButton active={activeTab === 'access-paths'} icon={GitBranch} label="Access Paths" onClick={() => setActiveTab('access-paths')} />
                <TabButton active={activeTab === 'dependencies'} icon={Activity} label="Dependencies" onClick={() => setActiveTab('dependencies')} />
                <TabButton active={activeTab === 'risk-findings'} icon={AlertTriangle} label="Risk Findings" onClick={() => setActiveTab('risk-findings')} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Section title="Identities">
                    <div className="space-y-3">
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Linux Users ({detail.directLinuxUsers.length})</h4>
                        <div className="space-y-1.5">
                          {detail.directLinuxUsers.map((u) => <LinuxIdentityAccessCard key={u.id} user={u} />)}
                          {detail.directLinuxUsers.length === 0 && <p className="text-xs text-gray-500">None</p>}
                        </div>
                      </Card>
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">AD Users ({detail.adUsers.length})</h4>
                        <div className="space-y-1.5">
                          {detail.adUsers.map((u) => <LinuxIdentityAccessCard key={u.id} user={u} />)}
                          {detail.adUsers.length === 0 && <p className="text-xs text-gray-500">None</p>}
                        </div>
                      </Card>
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">FreeIPA Users ({detail.freeIpaUsers.length})</h4>
                        <div className="space-y-1.5">
                          {detail.freeIpaUsers.map((u) => <LinuxIdentityAccessCard key={u.id} user={u} />)}
                          {detail.freeIpaUsers.length === 0 && <p className="text-xs text-gray-500">None</p>}
                        </div>
                      </Card>
                    </div>
                  </Section>
                  <Section title="Resources">
                    <div className="space-y-3">
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Applications ({detail.applications.length})</h4>
                        {detail.applications.length === 0 ? (
                          <p className="text-xs text-gray-500">None</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">{detail.applications.map((a) => <Badge key={a} variant="accent">{a}</Badge>)}</div>
                        )}
                      </Card>
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Databases ({detail.databases.length})</h4>
                        {detail.databases.length === 0 ? (
                          <p className="text-xs text-gray-500">None</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">{detail.databases.map((d) => <Badge key={d} variant="accent">{d}</Badge>)}</div>
                        )}
                      </Card>
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Business Services ({detail.businessServices.length})</h4>
                        {detail.businessServices.length === 0 ? (
                          <p className="text-xs text-gray-500">None</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">{detail.businessServices.map((b) => <Badge key={b} variant="danger">{b}</Badge>)}</div>
                        )}
                      </Card>
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Service Accounts ({detail.serviceAccounts.length})</h4>
                        {detail.serviceAccounts.length === 0 ? (
                          <p className="text-xs text-gray-500">None</p>
                        ) : (
                          <div className="space-y-1">
                            {detail.serviceAccounts.map((sa) => (
                              <div key={sa.id} className="flex items-center gap-2 rounded bg-white/5 px-2 py-1 text-xs">
                                <span className="text-gray-300">{sa.displayName}</span>
                                <span className="text-gray-500">({sa.principalName})</span>
                                {sa.interactiveShell && <Badge variant="warning">shell</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                      <Card className="p-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reverse Access</h4>
                        {reverseAccess && (
                          <div className="space-y-1 text-xs">
                            <p><span className="text-gray-500">Total identities: </span><span className="text-gray-300">{reverseAccess.totalIdentities}</span></p>
                            <p><span className="text-gray-500">Sudo users: </span><span className="text-gray-300">{reverseAccess.sudoUsers.join(', ') || 'none'}</span></p>
                            <p><span className="text-gray-500">SSH-only: </span><span className="text-gray-300">{reverseAccess.sshOnlyUsers.join(', ') || 'none'}</span></p>
                            <p><span className="text-gray-500">Indirect (AD): </span><span className="text-gray-300">{reverseAccess.indirectUsers.join(', ') || 'none'}</span></p>
                            <p className="mt-2 text-gray-400">{reverseAccess.impactDescription}</p>
                          </div>
                        )}
                      </Card>
                    </div>
                  </Section>
                </div>
              )}

              {activeTab === 'users-groups' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Section title="Linux Users">
                    <div className="space-y-1.5">
                      {detail.directLinuxUsers.map((u) => <LinuxIdentityAccessCard key={u.id} user={u} />)}
                      {detail.directLinuxUsers.length === 0 && <p className="text-sm text-gray-500">No Linux users.</p>}
                    </div>
                  </Section>
                  <Section title="Linux Groups">
                    <LinuxGroupAccessPanel groups={detail.linuxGroups} />
                  </Section>
                </div>
              )}

              {activeTab === 'ssh-access' && (
                <Section title="SSH Access">
                  <SSHAccessPanel sshKeys={detail.sshKeys} users={[...detail.directLinuxUsers, ...detail.adUsers, ...detail.freeIpaUsers]} />
                </Section>
              )}

              {activeTab === 'sudo-access' && (
                <Section title="Sudo Access">
                  <SudoAccessPanel sudoPolicies={detail.sudoPolicies} users={detail.directLinuxUsers} groups={detail.linuxGroups} />
                </Section>
              )}

              {activeTab === 'access-paths' && (
                <Section title="Access Paths" description="Full access chains from identity to host">
                  <LinuxAccessPath paths={allPaths} />
                </Section>
              )}

              {activeTab === 'dependencies' && (
                <Section title="Dependencies" description="Upstream access providers and downstream dependents">
                  <LinuxDependencyPanel dependencies={dependencies} />
                </Section>
              )}

              {activeTab === 'risk-findings' && (
                <Section title="Risk Findings" description="Security risks detected for this host">
                  <LinuxRiskFindings findings={riskFindings} />
                </Section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
