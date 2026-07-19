import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'

function lazyPage<T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T): LazyExoticComponent<ComponentType> {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType }))
}

const Home = lazyPage(() => import('./pages/Home'), 'Home')
const PipelinePage = lazyPage(() => import('./pages/Pipeline'), 'PipelinePage')
const GraphPage = lazyPage(() => import('./pages/Graph'), 'GraphPage')
const IdentitiesPage = lazyPage(() => import('./pages/Identities'), 'IdentitiesPage')
const UserProfilePage = lazyPage(() => import('./pages/UserProfile'), 'UserProfilePage')
const GroupsPage = lazyPage(() => import('./pages/Groups'), 'GroupsPage')
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

const page = (element: ReactNode) => (
  <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-white/5" aria-label="Loading page" />}>
    {element}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: page(<Home />) },
      { path: '/pipeline', element: page(<PipelinePage />) },
      { path: '/graph', element: page(<GraphPage />) },
      { path: '/identities', element: page(<IdentitiesPage />) },
      { path: '/identities/:userId', element: page(<UserProfilePage />) },
      { path: '/groups', element: page(<GroupsPage />) },
      { path: '/access', element: page(<AccessPage />) },
      { path: '/access/policies', element: page(<AccessPage />) },
      { path: '/access/roles', element: page(<AccessPage />) },
      { path: '/settings', element: page(<SettingsPage />) },
      { path: '/risk', element: page(<RiskFindingsPage />) },
      { path: '/attack-paths', element: page(<AttackPathsPage />) },
      { path: '/connectors', element: page(<ConnectorsPage />) },
      { path: '/linux-admin', element: page(<LinuxAdminPage />) },
      { path: '/business-questions', element: page(<BusinessQuestionsPage />) },
      { path: '/imports', element: page(<ImportsPage />) },
      { path: '/enterprise-identity', element: page(<EnterpriseIdentityPage />) },
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
])
