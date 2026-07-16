import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { Home, PipelinePage, GraphPage, UserProfilePage, LinuxAdminPage, BusinessQuestionsPage, ImportsPage } from './pages'

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
        path: '/identities/:userId',
        element: <UserProfilePage />,
      },
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
    ],
  },
])
