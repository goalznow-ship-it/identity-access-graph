import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { Home, PipelinePage, GraphPage, UserProfilePage, LinuxAdminPage, BusinessQuestionsPage, ImportsPage, IdentitiesPage, GroupsPage, AccessPage, SettingsPage, NotFoundPage, RiskFindingsPage, AttackPathsPage, ConnectorsPage } from './pages'

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/pipeline',
        element: <PipelinePage />,
      },
      {
        path: '/graph',
        element: <GraphPage />,
      },
      {
        path: '/identities',
        element: <IdentitiesPage />,
      },
      {
        path: '/identities/:userId',
        element: <UserProfilePage />,
      },
      { path: '/groups', element: <GroupsPage /> },
      { path: '/access', element: <AccessPage /> },
      { path: '/access/policies', element: <AccessPage /> },
      { path: '/access/roles', element: <AccessPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/risk', element: <RiskFindingsPage /> },
      { path: '/attack-paths', element: <AttackPathsPage /> },
      { path: '/connectors', element: <ConnectorsPage /> },
      {
        path: '/linux-admin',
        element: <LinuxAdminPage />,
      },
      {
        path: '/business-questions',
        element: <BusinessQuestionsPage />,
      },
      {
        path: '/imports',
        element: <ImportsPage />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
