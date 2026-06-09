import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    server: {
        proxy: {
            '/arena-v2': {
                target: 'https://api.are.na/v2',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/arena-v2/, '')
            }
        }
    },
  plugins: [react()],
})
