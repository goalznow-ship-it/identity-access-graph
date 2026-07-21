import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { installAuthenticatedFetch } from './services/authApi'

const cleanupFetch = installAuthenticatedFetch()
if (import.meta.hot) import.meta.hot.dispose(cleanupFetch)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><RouterProvider router={router} /></AuthProvider>
  </StrictMode>,
)
