import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core'] },
  server: {
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd()).VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
      '^/music(?:/|$)': {
        target: 'https://www.assanye.top:66',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (request, incoming) => {
            const cookie = incoming.headers.cookie?.match(/(?:^|;\s*)(music-token=[^;]+)/i)?.[1]
            request.setHeader('Cookie', cookie ?? '')
          })
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
}))
