import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ugwm6qnmpp.us-east-2.awsapprunner.com',
        changeOrigin: true,
        // Strip /api so backend sees root paths like /networth/history
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
