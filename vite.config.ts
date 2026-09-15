import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // Perfiles partner: una sola entrada para todos. El Worker
        // (worker/index.ts) la sirve para cualquier /p/<slug> del registro.
        partner: resolve(__dirname, 'p/index.html'),
        // Panel del cliente: una sola entrada para cualquier /panel/<token>.
        panel: resolve(__dirname, 'panel/index.html'),
      },
    },
  },
})
