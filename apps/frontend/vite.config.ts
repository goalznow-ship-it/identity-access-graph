import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/imports': 'http://localhost:3000',
      '/graph': 'http://localhost:3000',
      '/risk': 'http://localhost:3000',
      '/attack-path': 'http://localhost:3000',
      '/attack-paths': 'http://localhost:3000',
      '/connectors': 'http://localhost:3000',
      '/identity': 'http://localhost:3000',
      '/pipeline': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
})
