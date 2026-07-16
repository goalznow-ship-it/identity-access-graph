import { Search, Bell, Sun, User } from '../components/icons'

export function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        <span className="text-lg font-semibold text-gray-100">
          Identity Access Graph
        </span>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-gray-400">
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search...</span>
          </div>

          <button className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200">
            <Bell className="h-5 w-5" />
          </button>

          <button className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200">
            <Sun className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 rounded-lg p-1.5 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200">
            <User className="h-5 w-5" />
            <span className="hidden md:inline">Admin</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
