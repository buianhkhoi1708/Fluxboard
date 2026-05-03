import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Bắt mọi request bắt đầu bằng /ws-fluxboard
      '/ws-fluxboard': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        // Vite 6 đôi khi cần tường minh việc giữ nguyên path
        rewrite: (path) => path 
      }
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})