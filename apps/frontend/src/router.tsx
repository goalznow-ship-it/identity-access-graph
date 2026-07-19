import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'

function lazyPage<T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T): LazyExoticComponent<ComponentType> {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType }))
}

const Home = lazyPage(() => import('./pages/Home'), 'Home')
const PipelinePage = lazyPage(() => import('./pages/Pipeline'), 'PipelinePage')
const GraphPage = lazyPage(() => import('./pages/Graph'), 'GraphPage')
const IdentitiesPage = lazyPage(() => import('./pages/Identities'), 'IdentitiesPage')
const UserProfilePage = lazyPage(() => import('./pages/UserProfile'), 'UserProfilePage')
const GroupsPage = lazyPage(() => import('./pages/Groups'), 'GroupsPage')
const RelationshipsPage = lazyPage(() => import('./pages/Relationships'), 'RelationshipsPage')
const AccessPage = lazyPage(() => import('./pages/Access'), 'AccessPage')
const SettingsPage = lazyPage(() => import('./pages/Settings'), 'SettingsPage')
const RiskFindingsPage = lazyPage(() => import('./pages/RiskFindings'), 'RiskFindingsPage')
const AttackPathsPage = lazyPage(() => import('./pages/AttackPaths'), 'AttackPathsPage')
const ConnectorsPage = lazyPage(() => import('./pages/Connectors'), 'ConnectorsPage')
const LinuxAdminPage = lazyPage(() => import('./pages/LinuxAdmin'), 'LinuxAdminPage')
const BusinessQuestionsPage = lazyPage(() => import('./pages/BusinessQuestions'), 'BusinessQuestionsPage')
const ImportsPage = lazyPage(() => import('./pages/Imports'), 'ImportsPage')
const EnterpriseIdentityPage = lazyPage(() => import('./pages/EnterpriseIdentity'), 'EnterpriseIdentityPage')
const NotFoundPage = lazyPage(() => import('./pages/NotFound'), 'NotFoundPage')
const LoginPage = lazyPage(() => import('./pages/Login'), 'LoginPage')

const page = (element: ReactNode) => (
  <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-white/5" aria-label="Loading page" />}>
    {element}
  </Suspense>
)

export const router = createBrowserRouter([
  { path: '/login', element: page(<LoginPage />) },
  {
    element: <RequireAuth><App /></RequireAuth>,
    children: [
      { path: '/', element: page(<Home />) },
      { path: '/pipeline', element: page(<RequireRole role="ADMIN"><PipelinePage /></RequireRole>) },
      { path: '/graph', element: page(<GraphPage />) },
      { path: '/identities', element: page(<IdentitiesPage />) },
      { path: '/identities/:userId', element: page(<UserProfilePage />) },
      { path: '/groups', element: page(<GroupsPage />) },
      { path: '/relationships', element: page(<RelationshipsPage />) },
      { path: '/access', element: page(<AccessPage />) },
      { path: '/access/policies', element: page(<AccessPage />) },
      { path: '/access/roles', element: page(<AccessPage />) },
      { path: '/settings', element: page(<RequireRole role="ADMIN"><SettingsPage /></RequireRole>) },
      { path: '/risk', element: page(<RequireRole role="ANALYST"><RiskFindingsPage /></RequireRole>) },
      { path: '/attack-paths', element: page(<RequireRole role="ANALYST"><AttackPathsPage /></RequireRole>) },
      { path: '/connectors', element: page(<RequireRole role="ADMIN"><ConnectorsPage /></RequireRole>) },
      { path: '/linux-admin', element: page(<LinuxAdminPage />) },
      { path: '/business-questions', element: page(<BusinessQuestionsPage />) },
      { path: '/imports', element: page(<RequireRole role="ADMIN"><ImportsPage /></RequireRole>) },
      { path: '/enterprise-identity', element: page(<EnterpriseIdentityPage />) },
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
])
