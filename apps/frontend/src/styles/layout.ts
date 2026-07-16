export const LAYOUT = {
  navbar: {
    height: 56,
    zIndex: 50,
  },
  sidebar: {
    expanded: 260,
    collapsed: 72,
    zIndex: 40,
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const

export const SIDEBAR_WIDTH = {
  expanded: `${LAYOUT.sidebar.expanded}px`,
  collapsed: `${LAYOUT.sidebar.collapsed}px`,
} as const

export const NAVBAR_HEIGHT = `${LAYOUT.navbar.height}px` as const
