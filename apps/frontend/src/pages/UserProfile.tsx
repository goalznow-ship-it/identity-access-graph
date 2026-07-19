import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Tabs } from '../components/ui/Tabs'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Card } from '../components/ui/Card'
import { useUserProfile } from '../hooks/useUserProfile'
import { useGraphSource } from '../hooks/useGraphSource'
import { useGraphData } from '../hooks/useGraphData'
import {
  UserProfileHeader,
  IdentitySources,
  MembershipPanel,
  EffectiveAccessPanel,
  AccessPathExplorer,
  RiskFindingsPanel,
  RawPropertiesPanel,
} from '../components/identity'

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { source } = useGraphSource()
  const importId = typeof localStorage === 'undefined' ? null : localStorage.getItem('lastImportId')
  const graph = useGraphData(source === 'imported' ? importId : null, source)
  const { profile, loading, error } = useUserProfile(userId, graph.data, graph.loading, graph.error)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl pt-8">
        <Card className="p-6 text-center">
          <p className="text-danger">{error}</p>
          <button
            onClick={graph.error ? () => void graph.retry() : () => navigate(-1)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            {graph.error ? 'Retry graph loading' : 'Go back'}
          </button>
        </Card>
      </div>
    )
  }

  if (!profile) return null

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          <IdentitySources identities={profile.correlatedIdentities} />
        </div>
      ),
    },
    {
      id: 'groups-roles',
      label: 'Groups & Roles',
      content: (
        <MembershipPanel
          directGroups={profile.directGroups}
          indirectGroups={profile.indirectGroups}
          roles={profile.roles}
          permissions={profile.permissions}
        />
      ),
    },
    {
      id: 'effective-access',
      label: 'Effective Access',
      content: (
        <EffectiveAccessPanel access={profile.effectiveAccess} />
      ),
    },
    {
      id: 'access-paths',
      label: 'Access Paths',
      content: (
        <AccessPathExplorer access={profile.effectiveAccess} />
      ),
    },
    {
      id: 'risk-findings',
      label: 'Risk Findings',
      content: (
        <RiskFindingsPanel findings={profile.riskFindings} />
      ),
    },
    {
      id: 'raw-properties',
      label: 'Raw Properties',
      content: (
        <RawPropertiesPanel properties={profile.rawProperties} />
      ),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 pb-8"
    >
      <button
        onClick={() => navigate('/graph')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Graph Explorer
      </button>

      <UserProfileHeader user={profile.user} />

      <Tabs tabs={tabs} defaultTab="overview" />
    </motion.div>
  )
}
