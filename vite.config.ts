import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v01: resolve(__dirname, 'v01.html'),
        v02: resolve(__dirname, 'v02.html'),
        // Perfiles partner: una entrada por cliente, servida en /p/<slug>.
        'partner-danaarx': resolve(__dirname, 'p/danaarx/index.html'),
      },
    },
  },
})
