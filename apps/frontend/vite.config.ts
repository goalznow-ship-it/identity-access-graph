import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = 'http://localhost:3000'

const passThrough = (...roots: string[]) => ({
  target: backend,
  bypass: (req: { url?: string }) => {
    if (roots.includes(req.url ?? '')) return '/index.html'
  },
})

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/graph/nodes':              backend,
      '/graph/search':             backend,
      '/graph/subgraph':           backend,
      '/graph/dashboard-summary':  backend,
      '/graph/stats':              backend,
      '/graph/relationships':      backend,
      '/imports':      passThrough('/imports'),
      '/risk':         passThrough('/risk'),
      '/attack-paths': passThrough('/attack-paths'),
      '/attack-path':  backend,
      '/connectors':   passThrough('/connectors'),
      '/identity':     backend,
      '/pipeline':     backend,
      '/notifications': backend,
      '/admin':         backend,
      '/health':       backend,
    },
  },
})
