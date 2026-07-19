import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [exportError, setExportError] = useState('')
  useEffect(() => {
    const handleError = (event: Event) => {
      setExportError((event as CustomEvent<string>).detail || 'Export failed')
      window.setTimeout(() => setExportError(''), 5000)
    }
    window.addEventListener('iag:export-error', handleError)
    return () => window.removeEventListener('iag:export-error', handleError)
  }, [])

  return (
    <div className="flex h-screen">
      <Navbar />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <main
        className="workspace-main flex-1 overflow-auto pt-14 transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarCollapsed ? 72 : 260,
        }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      {exportError && <div role="alert" className="fixed bottom-5 right-5 z-[100] rounded border border-danger/40 bg-card px-4 py-3 text-sm text-danger shadow-xl">{exportError}</div>}
    </div>
  )
}
