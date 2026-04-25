import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Force Vite à surveiller les fichiers activement (nécessaire sous WSL)
    },
    host: true, // Permet l'accès via ton IP locale si besoin
  }
})