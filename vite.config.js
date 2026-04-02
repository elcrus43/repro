import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    },
    watch: {
      ignored: [
        '**/backend/**',
        '**/.notes/**',
        '**/extension/**',
        '**/dist/**',
        '**/supabase/**'
      ]
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'docx': ['docxtemplater', 'pizzip', 'file-saver'],
          'xlsx': ['xlsx']
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
})
