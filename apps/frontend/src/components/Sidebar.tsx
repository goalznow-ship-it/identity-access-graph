import { useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Share2,
  Users,
  Shield,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from '../components/icons'
import { Tooltip } from './ui/Tooltip'
import { useState } from 'react'

interface MenuItem {
  label: string
  icon: LucideIcon
  path: string
  children?: { label: string; path: string }[]
}

interface MenuGroup {
  group: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { label: 'Graph', icon: Share2, path: '/graph' },
    ],
  },
  {
    group: 'Management',
    items: [
      {
        label: 'Identities',
        icon: Users,
        path: '/identities',
        children: [
          { label: 'All Identities', path: '/identities' },
          { label: 'Groups', path: '/identities/groups' },
        ],
      },
      {
        label: 'Access',
        icon: Shield,
        path: '/access',
        children: [
          { label: 'Policies', path: '/access/policies' },
          { label: 'Roles', path: '/access/roles' },
        ],
      },
    ],
  },
  {
    group: 'System',
    items: [{ label: 'Settings', icon: Settings, path: '/settings' }],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  const isActive = (path: string) => pathname === path
  const isActiveParent = (item: MenuItem) =>
    isActive(item.path) ||
    item.children?.some((c) => isActive(c.path))

  const toggleSubMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <aside
      className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] flex-col border-r border-border
        bg-surface transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 72 : 260 }}
    >
      <div className="flex items-center border-b border-border px-4 py-3">
        <div className="flex-1" />
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {menuGroups.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActiveParent(item)
                const hasChildren = !!item.children?.length
                const isOpen = expandedMenus.has(item.label)

                return (
                  <div key={item.label}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="right">
                        <button
                          className={`flex w-full items-center justify-center rounded-lg p-2.5 text-sm font-medium
                            transition-all duration-200 hover:bg-white/[0.03]
                            ${active ? 'bg-primary-muted text-primary' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                        </button>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={() => {
                          if (hasChildren) toggleSubMenu(item.label)
                        }}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                          transition-all duration-200
                          ${active ? 'bg-primary-muted text-primary' : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'}`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {hasChildren && (
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </button>
                    )}

                    {!collapsed && hasChildren && isOpen && (
                      <div className="ml-8 mt-0.5 space-y-0.5 border-l border-border pl-3">
                        {item.children!.map((child) => (
                          <button
                            key={child.label}
                            className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors duration-200
                              ${
                                isActive(child.path)
                                  ? 'text-primary'
                                  : 'text-gray-500 hover:text-gray-200'
                              }`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
