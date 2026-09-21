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
        /* Paginas comerciales: una entrada por pagina, con su <head> propio.
           Son archivos estaticos, no pasan por el Worker: el titulo y la
           descripcion de la vista previa quedan resueltos en el build, que es
           lo que necesita WhatsApp (no ejecuta React). El contenido de las
           cuatro sale de src/paginas/paginas-data.ts y lo dibuja un solo
           modulo, main-pagina.tsx, que elige por la ruta. */
        software: resolve(__dirname, 'software/index.html'),
        comercios: resolve(__dirname, 'comercios/index.html'),
        personal: resolve(__dirname, 'personal/index.html'),
        objetos: resolve(__dirname, 'objetos/index.html'),
      },
    },
  },
})
