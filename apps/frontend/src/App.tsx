import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen">
      <Navbar />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <main
        className="flex-1 overflow-auto pt-14 transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarCollapsed ? 72 : 260,
        }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
